import { authenticateUser, findUserById, getAllowedWorkflowIds } from './accessControl.js';
import { buildOverview, checkHealth, countExecutionsInRange, listRecentExecutions, listWorkflows } from './dashboardCore.js';
import { readRbacConfig, sanitizeRbacConfigForAdmin, writeRbacConfig } from './rbacStore.js';
import { extractBearerTokenFromHeaders, issueToken, verifyToken } from './tokenAuth.js';
import { getQueryParam, readJsonBody, sendJson } from './httpUtils.js';

const AUTH_SECRET = () => process.env.APP_AUTH_SECRET || 'change-this-secret';

function tokenFromReq(req) {
  const headerToken = extractBearerTokenFromHeaders(req.headers || {});
  if (headerToken) return headerToken;
  return getQueryParam(req.url, 'token');
}

async function requireUser(req, res) {
  const token = tokenFromReq(req);
  const payload = verifyToken(token, AUTH_SECRET());
  if (!payload?.sub) {
    sendJson(res, 401, { error: 'Authentication required' });
    return null;
  }

  const config = await readRbacConfig();
  const user = findUserById(config, payload.sub);
  if (!user) {
    sendJson(res, 401, { error: 'Invalid user session' });
    return null;
  }
  return { user, config };
}

function userView(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };
}

export function createApiRouter(n8n) {
  return async function handleApi(req, res) {
    const method = String(req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    try {
      if (pathname === '/api/health' && method === 'GET') {
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await readJsonBody(req);
        const config = await readRbacConfig();
        const user = authenticateUser(config, body.email, body.password);
        if (!user) {
          sendJson(res, 401, { error: 'Invalid email or password' });
          return true;
        }

        const token = issueToken(
          {
            sub: user.id,
            role: user.role,
            email: user.email,
            clientId: user.clientId,
          },
          AUTH_SECRET(),
          60 * 60 * 24
        );
        sendJson(res, 200, { token, user: userView(user) });
        return true;
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        sendJson(res, 200, { user: userView(auth.user) });
        return true;
      }

      if (pathname === '/api/admin/rbac' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        if (auth.user.role !== 'admin') {
          sendJson(res, 403, { error: 'Admin role required' });
          return true;
        }
        sendJson(res, 200, sanitizeRbacConfigForAdmin(auth.config));
        return true;
      }

      if (pathname === '/api/admin/rbac' && method === 'PUT') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        if (auth.user.role !== 'admin') {
          sendJson(res, 403, { error: 'Admin role required' });
          return true;
        }
        const body = await readJsonBody(req);
        const saved = await writeRbacConfig(body);
        sendJson(res, 200, sanitizeRbacConfigForAdmin(saved));
        return true;
      }

      if (pathname.startsWith('/api/dashboard/')) {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        const access = { allowedWorkflowIds: getAllowedWorkflowIds(auth.config, auth.user) };

        if (pathname === '/api/dashboard/overview' && method === 'GET') {
          sendJson(res, 200, await buildOverview(n8n, access));
          return true;
        }

        if (pathname === '/api/dashboard/recent-executions' && method === 'GET') {
          sendJson(res, 200, await listRecentExecutions(n8n, 25, access));
          return true;
        }

        if (pathname === '/api/dashboard/workflows' && method === 'GET') {
          sendJson(res, 200, await listWorkflows(n8n, 200, access));
          return true;
        }

        if (pathname === '/api/dashboard/executions-count' && method === 'GET') {
          const from = getQueryParam(req.url, 'from');
          const to = getQueryParam(req.url, 'to');
          sendJson(res, 200, await countExecutionsInRange(n8n, { from, to, access }));
          return true;
        }

        if (pathname === '/api/dashboard/health' && method === 'GET') {
          sendJson(res, 200, await checkHealth(n8n));
          return true;
        }

        if (pathname === '/api/dashboard/stream' && method === 'GET') {
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
              send('overview', await buildOverview(n8n, access));
            } catch (error) {
              send('server-error', { message: error?.message || String(error) });
            }
          };

          const timer = setInterval(() => {
            if (!closed) void sendOverview();
          }, intervalMs);

          void sendOverview();
          req.on('close', () => {
            closed = true;
            clearInterval(timer);
          });
          return true;
        }

        sendJson(res, 404, { error: 'Not found' });
        return true;
      }
    } catch (error) {
      sendJson(res, Number.isFinite(error?.status) ? error.status : 500, { error: error?.message || String(error) });
      return true;
    }

    return false;
  };
}
