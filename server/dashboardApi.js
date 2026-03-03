import { buildOverview, listRecentExecutions, listWorkflows, checkHealth } from './dashboardCore.js';

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function sendError(res, err) {
  const status = Number.isFinite(err?.status) ? err.status : 500;
  sendJson(res, status, { error: err?.message || String(err) });
}

export function createDashboardApi(n8n) {
  return async function handleDashboardApi(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    try {
      if (pathname === '/api/dashboard/overview') {
        sendJson(res, 200, await buildOverview(n8n));
        return true;
      }

      if (pathname === '/api/dashboard/recent-executions') {
        sendJson(res, 200, await listRecentExecutions(n8n, 25));
        return true;
      }

      if (pathname === '/api/dashboard/workflows') {
        sendJson(res, 200, await listWorkflows(n8n, 200));
        return true;
      }

      if (pathname === '/api/dashboard/health') {
        sendJson(res, 200, await checkHealth(n8n));
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
