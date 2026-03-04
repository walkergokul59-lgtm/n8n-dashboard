import { filterExecutions, filterWorkflows } from './accessControl.js';

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toStartOfDay(value) {
  const d = toDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function toEndOfDay(value) {
  const d = toDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function pickTimestamp(execution) {
  return (
    toDate(execution?.startedAt) ||
    toDate(execution?.stoppedAt) ||
    toDate(execution?.finishedAt) ||
    toDate(execution?.createdAt) ||
    toDate(execution?.updatedAt) ||
    null
  );
}

function isFailure(execution) {
  const status = String(execution?.status || execution?.finished || '').toLowerCase();
  return status.includes('error') || status.includes('fail') || status.includes('crash');
}

function getDurationMs(execution) {
  const startedAt = toDate(execution?.startedAt);
  const stoppedAt = toDate(execution?.stoppedAt) || toDate(execution?.finishedAt);
  if (!startedAt || !stoppedAt) return null;
  const ms = stoppedAt.getTime() - startedAt.getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function buildHourlySeries(now, executions, hours = 24) {
  const buckets = Array.from({ length: hours }).map((_, i) => {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    end.setHours(end.getHours() - (hours - 1 - i));
    return { timestamp: end.toISOString(), executions: 0 };
  });

  const idxByIso = new Map(buckets.map((b, i) => [b.timestamp, i]));

  for (const ex of executions) {
    const ts = pickTimestamp(ex);
    if (!ts) continue;
    const hourKey = new Date(ts);
    hourKey.setMinutes(0, 0, 0);
    const iso = hourKey.toISOString();
    const idx = idxByIso.get(iso);
    if (idx !== undefined) buckets[idx].executions += 1;
  }

  return buckets;
}

async function collectExecutionsWindow(n8n, { maxPages = 5, pageSize = 100, minSince }) {
  const all = [];
  let cursor = undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const { items, cursor: nextCursor } = await n8n.listExecutions({
      limit: pageSize,
      includeData: false,
      cursor,
    });
    if (!Array.isArray(items) || items.length === 0) break;

    all.push(...items);
    cursor = nextCursor || undefined;

    const timestamps = items.map(pickTimestamp).filter(Boolean);
    const oldest = timestamps.length ? new Date(Math.min(...timestamps.map((d) => d.getTime()))) : null;
    if (oldest && oldest.getTime() < minSince.getTime()) break;

    if (!nextCursor) break;
  }
  return all;
}

function dedupeExecutionsById(executions) {
  const seen = new Set();
  const out = [];
  for (const execution of executions || []) {
    const id = execution?.id ?? execution?.executionId ?? execution?.data?.id ?? null;
    if (!id) {
      out.push(execution);
      continue;
    }
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(execution);
  }
  return out;
}

async function collectExecutionsForWorkflowIds(n8n, workflowIds, { pageSize = 100, maxPagesPerWorkflow = 5, minSince = null, maxCollected = Infinity } = {}) {
  const workflowIdList = [...(workflowIds || [])].map((id) => String(id)).filter(Boolean);

  // Fetch all workflows in parallel instead of sequentially
  const perWorkflow = await Promise.all(
    workflowIdList.map(async (workflowId) => {
      const items = [];
      let cursor = undefined;
      for (let page = 0; page < maxPagesPerWorkflow; page += 1) {
        const { items: batch, cursor: nextCursor } = await n8n.listExecutions({
          limit: pageSize,
          includeData: false,
          cursor,
          workflowId,
        });

        if (!Array.isArray(batch) || batch.length === 0) break;
        items.push(...batch);
        if (items.length >= maxCollected) break;

        if (minSince) {
          const timestamps = batch.map(pickTimestamp).filter(Boolean);
          const oldest = timestamps.length ? new Date(Math.min(...timestamps.map((d) => d.getTime()))) : null;
          if (oldest && oldest.getTime() < minSince.getTime()) break;
        }

        if (!nextCursor) break;
        cursor = nextCursor;
      }
      return items;
    })
  );

  const all = perWorkflow.flat();
  const deduped = dedupeExecutionsById(all);
  return filterExecutions(deduped, new Set(workflowIdList));
}

export async function buildOverview(n8n, access = { allowedWorkflowIds: null }) {
  const now = new Date();
  const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const allowedWorkflowIds = access?.allowedWorkflowIds ?? null;

  if (allowedWorkflowIds instanceof Set && allowedWorkflowIds.size === 0) {
    return {
      volumeData: buildHourlySeries(now, [], 24),
      totalExecutions: 0,
      executionsChange: 0,
      totalCost: 0,
      costChange: 0,
      failures24h: 0,
      errorRate: 0,
      errorRateChange: 0,
      averageDuration: 0,
      durationChange: 0,
      recentExecutions: [],
    };
  }

  let scopedExecutions = [];
  if (allowedWorkflowIds instanceof Set) {
    scopedExecutions = await collectExecutionsForWorkflowIds(n8n, allowedWorkflowIds, {
      pageSize: 100,
      maxPagesPerWorkflow: 2,
      minSince: since48h,
      maxCollected: 400,
    });
  } else {
    const rawExecutions = await collectExecutionsWindow(n8n, { maxPages: 5, minSince: since48h });
    scopedExecutions = filterExecutions(rawExecutions, allowedWorkflowIds);
  }

  const last48h = scopedExecutions
    .map((ex) => ({ ex, ts: pickTimestamp(ex) }))
    .filter((x) => x.ts && x.ts.getTime() >= since48h.getTime())
    .sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const split = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const current24 = last48h.filter((x) => x.ts.getTime() >= split.getTime()).map((x) => x.ex);
  const prev24 = last48h.filter((x) => x.ts.getTime() < split.getTime()).map((x) => x.ex);

  const currentTotal = current24.length;
  const prevTotal = prev24.length;

  const currentFailures = current24.filter(isFailure).length;
  const prevFailures = prev24.filter(isFailure).length;

  const currentErrorRate = currentTotal ? (currentFailures / currentTotal) * 100 : 0;
  const prevErrorRate = prevTotal ? (prevFailures / prevTotal) * 100 : 0;

  const currentDurations = current24.map(getDurationMs).filter((ms) => Number.isFinite(ms));
  const prevDurations = prev24.map(getDurationMs).filter((ms) => Number.isFinite(ms));

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const currentAvgDuration = avg(currentDurations);
  const prevAvgDuration = avg(prevDurations);

  return {
    volumeData: buildHourlySeries(now, current24, 24),
    totalExecutions: currentTotal,
    executionsChange: Math.round(percentChange(currentTotal, prevTotal)),
    totalCost: 0,
    costChange: 0,
    failures24h: currentFailures,
    errorRate: Number(currentErrorRate.toFixed(1)),
    errorRateChange: Number((currentErrorRate - prevErrorRate).toFixed(1)),
    averageDuration: Math.round(currentAvgDuration),
    durationChange: Math.round(currentAvgDuration - prevAvgDuration),
    recentExecutions: current24.slice(0, 20).map((ex) => ({
      id: ex.id ?? ex.executionId ?? ex?.data?.id ?? null,
      workflowId: ex.workflowId ?? ex.workflow?.id ?? null,
      status: ex.status ?? (isFailure(ex) ? 'failed' : 'success'),
      startedAt: ex.startedAt ?? null,
      stoppedAt: ex.stoppedAt ?? ex.finishedAt ?? null,
      durationMs: getDurationMs(ex),
    })),
  };
}

export async function listRecentExecutions(n8n, limit = 25, access = { allowedWorkflowIds: null }) {
  const desired = Math.max(1, Number(limit) || 25);
  const allowedWorkflowIds = access?.allowedWorkflowIds ?? null;
  let collected = [];

  if (allowedWorkflowIds instanceof Set && allowedWorkflowIds.size === 0) {
    collected = [];
  } else if (allowedWorkflowIds instanceof Set) {
    collected = await collectExecutionsForWorkflowIds(n8n, allowedWorkflowIds, {
      pageSize: Math.max(100, desired),
      maxPagesPerWorkflow: 3,
      maxCollected: Math.max(desired * 2, 50),
    });
  } else {
    const pageSize = Math.max(100, desired);
    const maxPages = 10;
    let cursor = undefined;
    for (let page = 0; page < maxPages; page += 1) {
      const { items, cursor: nextCursor } = await n8n.listExecutions({
        limit: pageSize,
        includeData: false,
        cursor,
      });
      if (!Array.isArray(items) || items.length === 0) break;

      const scopedItems = filterExecutions(items, allowedWorkflowIds);
      collected.push(...scopedItems);

      if (collected.length >= desired) break;
      if (!nextCursor) break;
      cursor = nextCursor;
    }
  }

  const normalized = (collected || [])
    .map((ex) => ({ ex, ts: pickTimestamp(ex) }))
    .filter((x) => x.ts)
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())
    .slice(0, desired)
    .map(({ ex, ts }) => ({
      id: ex.id ?? ex.executionId ?? null,
      workflowId: ex.workflowId ?? ex.workflow?.id ?? null,
      status: ex.status ?? (isFailure(ex) ? 'failed' : 'success'),
      timestamp: ts.toISOString(),
      durationMs: getDurationMs(ex),
    }));
  return { data: normalized };
}

export async function listWorkflows(n8n, limit = 200, access = { allowedWorkflowIds: null }) {
  const { items } = await n8n.listWorkflows({ limit });
  const scopedItems = filterWorkflows(items || [], access?.allowedWorkflowIds ?? null);
  const normalized = (scopedItems || []).map((wf) => ({
    id: wf.id ?? null,
    name: wf.name ?? wf?.data?.name ?? 'Unnamed',
    active: Boolean(wf.active),
    updatedAt: wf.updatedAt ?? null,
  }));
  return { data: normalized };
}

export async function checkHealth(n8n) {
  const started = Date.now();
  await n8n.listWorkflows({ limit: 1 });
  return { ok: true, n8nLatencyMs: Date.now() - started };
}

export async function countExecutionsInRange(
  n8n,
  {
    from = null,
    to = null,
    access = { allowedWorkflowIds: null },
  } = {}
) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = toStartOfDay(from || defaultFrom);
  const rangeEnd = toEndOfDay(to || now);

  if (!rangeStart || !rangeEnd) {
    const err = new Error('Invalid date range. Use YYYY-MM-DD for from/to.');
    err.status = 400;
    throw err;
  }

  if (rangeStart.getTime() > rangeEnd.getTime()) {
    const err = new Error('Invalid date range. "from" must be before or equal to "to".');
    err.status = 400;
    throw err;
  }

  const allowedWorkflowIds = access?.allowedWorkflowIds ?? null;
  if (allowedWorkflowIds instanceof Set && allowedWorkflowIds.size === 0) {
    return {
      count: 0,
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    };
  }

  let scopedExecutions = [];
  if (allowedWorkflowIds instanceof Set) {
    scopedExecutions = await collectExecutionsForWorkflowIds(n8n, allowedWorkflowIds, {
      pageSize: 100,
      maxPagesPerWorkflow: 6,
      minSince: rangeStart,
      maxCollected: 5000,
    });
  } else {
    const rawExecutions = await collectExecutionsWindow(n8n, {
      maxPages: 30,
      pageSize: 100,
      minSince: rangeStart,
    });
    scopedExecutions = filterExecutions(rawExecutions, allowedWorkflowIds);
  }

  let count = 0;
  for (const execution of scopedExecutions) {
    const ts = pickTimestamp(execution);
    if (!ts) continue;
    const ms = ts.getTime();
    if (ms >= rangeStart.getTime() && ms <= rangeEnd.getTime()) count += 1;
  }

  return {
    count,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
  };
}
