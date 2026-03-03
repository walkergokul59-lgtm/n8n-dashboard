import fs from 'node:fs';
import path from 'node:path';

function parseDotEnv(text) {
  const out = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadDotEnvIfPresent() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const parsed = parseDotEnv(fs.readFileSync(envPath, 'utf-8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function loadEnv() {
  loadDotEnvIfPresent();

  const n8nBaseUrl = process.env.N8N_BASE_URL?.trim();
  const n8nApiBasePath = (process.env.N8N_API_BASE_PATH?.trim() || '/api/v1').replace(/\/+$/, '');
  const n8nToken = process.env.N8N_API_TOKEN?.trim();
  const n8nAuthType = (process.env.N8N_AUTH_TYPE?.trim() || 'bearer').toLowerCase(); // bearer | header
  const n8nHeaderName = (process.env.N8N_AUTH_HEADER?.trim() || 'X-N8N-API-KEY').trim();

  if (!n8nBaseUrl) {
    throw new Error('Missing env: N8N_BASE_URL (example: http://localhost:5678)');
  }
  if (!n8nToken) {
    throw new Error('Missing env: N8N_API_TOKEN (your n8n API token)');
  }
  if (!['bearer', 'header'].includes(n8nAuthType)) {
    throw new Error('Invalid env: N8N_AUTH_TYPE must be "bearer" or "header"');
  }

  return {
    n8nBaseUrl: n8nBaseUrl.replace(/\/+$/, ''),
    n8nApiBasePath,
    n8nToken,
    n8nAuthType,
    n8nHeaderName,
  };
}
