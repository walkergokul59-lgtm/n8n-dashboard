import { N8nClient } from '../../server/n8nClient.js';
import { createApiRouter } from '../../server/apiRouter.js';

// ---------- Environment bootstrap (same as server/env.js) ----------

function loadEnvFromProcess() {
  const n8nBaseUrl = process.env.N8N_BASE_URL?.trim();
  const n8nApiBasePath = (process.env.N8N_API_BASE_PATH?.trim() || '/api/v1').replace(/\/+$/, '');
  const n8nToken = process.env.N8N_API_TOKEN?.trim();
  const n8nAuthType = (process.env.N8N_AUTH_TYPE?.trim() || 'bearer').toLowerCase();
  const n8nHeaderName = (process.env.N8N_AUTH_HEADER?.trim() || 'X-N8N-API-KEY').trim();

  if (!n8nBaseUrl || !n8nToken) return null;
  return {
    n8nBaseUrl: n8nBaseUrl.replace(/\/+$/, ''),
    n8nApiBasePath,
    n8nToken,
    n8nAuthType,
    n8nHeaderName,
  };
}

// Singleton — survives across warm invocations
let handleApi = null;

function getRouter() {
  if (handleApi) return handleApi;
  const env = loadEnvFromProcess();
  if (!env) {
    // Return a handler that always errors when n8n env is missing
    handleApi = async (_req, res) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Server misconfigured: N8N_BASE_URL or N8N_API_TOKEN missing' }));
      return true;
    };
    return handleApi;
  }
  const n8n = new N8nClient(env);
  handleApi = createApiRouter(n8n);
  return handleApi;
}

// ---------- Netlify → Node.js req/res adapter ----------

function buildMockReq(event) {
  const method = event.httpMethod || 'GET';
  // Reconstruct full URL path with query string
  const qs = event.rawQuery || '';
  const url = qs ? `${event.path}?${qs}` : event.path;

  const headers = {};
  for (const [key, value] of Object.entries(event.headers || {})) {
    headers[key.toLowerCase()] = value;
  }

  const bodyStr = event.body || '';

  // Create a mock request that is async-iterable (for readJsonBody)
  const req = {
    method,
    url,
    headers,
    on: () => {},
    // Make req async-iterable so readJsonBody(req) works
    [Symbol.asyncIterator]() {
      let done = false;
      return {
        next() {
          if (done || !bodyStr) {
            return Promise.resolve({ done: true, value: undefined });
          }
          done = true;
          return Promise.resolve({ done: false, value: Buffer.from(bodyStr) });
        },
      };
    },
  };

  return req;
}

function buildMockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _chunks: [],
    _ended: false,

    setHeader(key, value) {
      res._headers[key.toLowerCase()] = value;
    },

    writeHead(status, headers) {
      res.statusCode = status;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          res._headers[k.toLowerCase()] = v;
        }
      }
    },

    write(chunk) {
      res._chunks.push(typeof chunk === 'string' ? chunk : String(chunk));
    },

    end(data) {
      if (data !== undefined && data !== null) {
        res._chunks.push(typeof data === 'string' ? data : String(data));
      }
      res._ended = true;
    },

    getBody() {
      return res._chunks.join('');
    },
  };

  return res;
}

// ---------- Netlify Function handler ----------

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  const router = getRouter();
  const req = buildMockReq(event);
  const res = buildMockRes();

  try {
    const handled = await router(req, res);

    if (!handled) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' }),
      };
    }

    return {
      statusCode: res.statusCode,
      headers: res._headers,
      body: res.getBody(),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: err?.message || String(err) }),
    };
  }
}
