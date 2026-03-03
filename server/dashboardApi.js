function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

async function collectExecutionsWindow(n8n, { maxPages = 10, pageSize = 100, minSince }) {
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

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function sendError(res, err) {
  const status = Number.isFinite(err?.status) ? err.status : 500;
  sendJson(res, status, { error: err?.message || String(err) });
}

async function buildOverview(n8n) {
  const now = new Date();
  const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const rawExecutions = await collectExecutionsWindow(n8n, { minSince: since48h });

  const last48h = rawExecutions
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

export function createDashboardApi(n8n) {
  return async function handleDashboardApi(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    try {
      if (pathname === '/api/dashboard/overview') {
        const overview = await buildOverview(n8n);
        sendJson(res, 200, overview);
        return true;
      }

      if (pathname === '/api/dashboard/recent-executions') {
        const { items } = await n8n.listExecutions({ limit: 25, includeData: false });
        const normalized = (items || [])
          .map((ex) => ({ ex, ts: pickTimestamp(ex) }))
          .filter((x) => x.ts)
          .sort((a, b) => b.ts.getTime() - a.ts.getTime())
          .slice(0, 25)
          .map(({ ex, ts }) => ({
            id: ex.id ?? ex.executionId ?? null,
            workflowId: ex.workflowId ?? ex.workflow?.id ?? null,
            status: ex.status ?? (isFailure(ex) ? 'failed' : 'success'),
            timestamp: ts.toISOString(),
            durationMs: getDurationMs(ex),
          }));
        sendJson(res, 200, { data: normalized });
        return true;
      }

      if (pathname === '/api/dashboard/workflows') {
        const { items } = await n8n.listWorkflows({ limit: 200 });
        const normalized = (items || []).map((wf) => ({
          id: wf.id ?? null,
          name: wf.name ?? wf?.data?.name ?? 'Unnamed',
          active: Boolean(wf.active),
          updatedAt: wf.updatedAt ?? null,
        }));
        sendJson(res, 200, { data: normalized });
        return true;
      }

      if (pathname === '/api/dashboard/health') {
        const started = Date.now();
        await n8n.listWorkflows({ limit: 1 });
        sendJson(res, 200, { ok: true, n8nLatencyMs: Date.now() - started });
        return true;
      }

      if (pathname === '/api/dashboard/stream') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        const intervalMs = Math.max(1500, Number(url.searchParams.get('intervalMs') || 5000));
        let closed = false;

        const send = (event, data) => {
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const sendOverview = async () => {
          try {
            const overview = await buildOverview(n8n);
            send('overview', overview);
          } catch (err) {
            send('server-error', { message: err?.message || String(err) });
          }
        };

        const timer = setInterval(() => {
          if (closed) return;
          void sendOverview();
        }, intervalMs);

        void sendOverview();

        req.on('close', () => {
          closed = true;
          clearInterval(timer);
        });
        return true;
      }
    } catch (err) {
      sendError(res, err);
      return true;
    }

    return false;
  };
}

