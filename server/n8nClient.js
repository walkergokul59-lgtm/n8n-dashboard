function joinUrl(base, path) {
  const a = String(base || '').replace(/\/+$/, '');
  const b = String(path || '').replace(/^\/+/, '');
  return `${a}/${b}`;
}

function withQuery(url, query) {
  const u = new URL(url);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') continue;
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}

function buildAuthHeaders({ n8nToken, n8nAuthType, n8nHeaderName }) {
  if (n8nAuthType === 'header') {
    return { [n8nHeaderName]: n8nToken };
  }
  return { Authorization: `Bearer ${n8nToken}` };
}

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.executions)) return payload.executions;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function getPayloadCursor(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.nextCursor ??
    payload.next_cursor ??
    payload.cursor ??
    payload.next ??
    payload.nextPageCursor ??
    null
  );
}

export class N8nClient {
  constructor(env) {
    this.env = env;
    this.baseApiUrl = joinUrl(env.n8nBaseUrl, env.n8nApiBasePath);
    this.authHeaders = buildAuthHeaders(env);
    this._workingExecutionQuery = null; // Cache the working query variant
  }

  async requestJson(path, { method = 'GET', query, headers, body, signal } = {}) {
    const url = withQuery(joinUrl(this.baseApiUrl, path), query);

    // Add 8-second timeout if no signal provided
    const controller = signal ? undefined : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...this.authHeaders,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: signal || (controller ? controller.signal : undefined),
      });

      const text = await res.text();
      const contentType = res.headers.get('content-type') || '';
      const parsed = contentType.includes('application/json') && text ? JSON.parse(text) : text;

      if (!res.ok) {
        const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        const err = new Error(`n8n API ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
        err.status = res.status;
        throw err;
      }

      return parsed;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async listExecutions({ limit = 100, status, includeData = false, cursor, workflowId } = {}) {
    // Try the most common params first; fall back if an instance rejects them.
    const fullQueryList = [
      { limit, status, includeData, cursor, workflowId },
      { limit, status, cursor, workflowId },
      { limit, status, workflowId },
      { limit, workflowId },
      { limit, status, includeData, cursor },
      { limit, status, cursor },
      { limit, status },
      { limit },
    ];

    // If we've found a working variant, try it first
    let tryQueries;
    if (this._workingExecutionQuery) {
      tryQueries = [
        this._workingExecutionQuery,
        ...fullQueryList.filter(q => JSON.stringify(q) !== JSON.stringify(this._workingExecutionQuery))
      ];
    } else {
      tryQueries = fullQueryList;
    }

    let lastErr = null;
    for (const query of tryQueries) {
      try {
        const payload = await this.requestJson('executions', { query });
        // Cache this working variant for future calls
        if (!this._workingExecutionQuery) {
          this._workingExecutionQuery = query;
        }
        return {
          items: normalizeListPayload(payload),
          cursor: getPayloadCursor(payload),
          raw: payload,
        };
      } catch (err) {
        lastErr = err;
        // If unauthorized, don't keep trying variations.
        if (err?.status === 401 || err?.status === 403) break;
      }
    }
    throw lastErr || new Error('Failed to list executions from n8n');
  }

  async listWorkflows({ limit = 200, cursor } = {}) {
    const tryQueries = [{ limit, cursor }, { limit }, {}];
    let lastErr = null;
    for (const query of tryQueries) {
      try {
        const payload = await this.requestJson('workflows', { query });
        return {
          items: normalizeListPayload(payload),
          cursor: getPayloadCursor(payload),
          raw: payload,
        };
      } catch (err) {
        lastErr = err;
        if (err?.status === 401 || err?.status === 403) break;
      }
    }
    throw lastErr || new Error('Failed to list workflows from n8n');
  }
}
