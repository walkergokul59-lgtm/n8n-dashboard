import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from './env.js';
import { N8nClient } from './n8nClient.js';
import { createApiRouter } from './apiRouter.js';

const isProd = process.argv.includes('--prod');
const preferredPort = Number(process.env.PORT || 5173);

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.map') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listenOnAvailablePort(server, startPort, maxAttempts = 20) {
  let nextPort = Number(startPort) || 5173;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await new Promise((resolve) => {
      const onError = (error) => {
        server.off('listening', onListening);
        resolve({ ok: false, error });
      };

      const onListening = () => {
        server.off('error', onError);
        resolve({ ok: true, port: nextPort });
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(nextPort);
    });

    if (result.ok) {
      return result.port;
    }

    if (result.error?.code === 'EADDRINUSE') {
      nextPort += 1;
      continue;
    }

    throw result.error;
  }

  throw new Error(`Unable to bind server after ${maxAttempts} attempts starting from port ${startPort}.`);
}

async function start() {
  const env = loadEnv();
  const n8n = new N8nClient(env);
  const handleApi = createApiRouter(n8n);

  const distDir = path.resolve(process.cwd(), 'dist');

  let vite = null;

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }

        if (req.url.startsWith('/api/')) {
          const handled = await handleApi(req, res);
          if (handled) return;
        }

        if (!isProd && vite) {
          vite.middlewares(req, res, async () => {
            try {
              const url = req.originalUrl || req.url;
              const raw = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
              const html = await vite.transformIndexHtml(url, raw);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
            } catch (e) {
              vite.ssrFixStacktrace(e);
              res.statusCode = 500;
              res.end(String(e?.message || e));
            }
          });
          return;
        }

        // Production static serving
        const url = new URL(req.url, 'http://localhost');
        const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const candidate = path.join(distDir, rel || 'index.html');

        if (rel && (await fileExists(candidate))) {
          const buf = await fs.readFile(candidate);
          res.statusCode = 200;
          res.setHeader('Content-Type', contentTypeFor(candidate));
          res.end(buf);
          return;
        }

        // SPA fallback
        const indexPath = path.join(distDir, 'index.html');
        const indexHtml = await fs.readFile(indexPath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(indexHtml);
      } catch (err) {
        res.statusCode = 500;
        res.end(err?.message || String(err));
      }
    })();
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });
  }

  const boundPort = await listenOnAvailablePort(server, preferredPort);
  if (boundPort !== preferredPort) {
    console.warn(`Port ${preferredPort} is in use. Switched to http://localhost:${boundPort}`);
  }
  console.log(`Dashboard server listening on http://localhost:${boundPort} (${isProd ? 'prod' : 'dev'})`);
}

start().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
