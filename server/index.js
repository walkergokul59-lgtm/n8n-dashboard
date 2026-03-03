import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from './env.js';
import { N8nClient } from './n8nClient.js';
import { createDashboardApi } from './dashboardApi.js';

const isProd = process.argv.includes('--prod');
const port = Number(process.env.PORT || 5173);

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

async function start() {
  const env = loadEnv();
  const n8n = new N8nClient(env);
  const handleDashboardApi = createDashboardApi(n8n);

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

        if (req.url === '/api/health') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.url.startsWith('/api/dashboard/')) {
          const handled = await handleDashboardApi(req, res);
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

  server.listen(port, () => {
    console.log(`Dashboard server listening on http://localhost:${port} (${isProd ? 'prod' : 'dev'})`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
