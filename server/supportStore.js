import fs from 'node:fs/promises';
import path from 'node:path';

const SUPPORT_STATUSES = new Set(['open', 'closed']);
const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const DEFAULT_SUPPORT = { tickets: [] };
const memoryStateKey = '__n8n_dashboard_support__';
const kvStateKey = '__n8n_dashboard_support_kv__';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTimestamp(value, fallback = FALLBACK_TIMESTAMP) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return SUPPORT_STATUSES.has(normalized) ? normalized : 'open';
}

function normalizeMessage(message, index) {
  return {
    id: String(message?.id || `msg-${index + 1}`),
    authorUserId: String(message?.authorUserId || ''),
    authorRole: String(message?.authorRole || 'client') === 'admin' ? 'admin' : 'client',
    authorLabel: String(message?.authorLabel || '').trim(),
    body: String(message?.body || '').trim(),
    createdAt: normalizeTimestamp(message?.createdAt),
  };
}

function latestTimestamp(values, fallback = FALLBACK_TIMESTAMP) {
  return values
    .map((value) => normalizeTimestamp(value, fallback))
    .sort((left, right) => (left > right ? -1 : 1))[0] || fallback;
}

function normalizeTicket(ticket, index) {
  const messages = ensureArray(ticket?.messages)
    .map(normalizeMessage)
    .filter((message) => message.body)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  const createdAt = normalizeTimestamp(ticket?.createdAt);
  const closedAt = ticket?.closedAt ? normalizeTimestamp(ticket.closedAt) : null;
  const updatedAt = latestTimestamp([
    ticket?.updatedAt,
    createdAt,
    closedAt,
    messages[messages.length - 1]?.createdAt,
  ], createdAt);

  return {
    id: String(ticket?.id || `ticket-${index + 1}`),
    clientId: String(ticket?.clientId || ''),
    clientUserId: String(ticket?.clientUserId || ''),
    clientName: String(ticket?.clientName || '').trim(),
    clientEmail: String(ticket?.clientEmail || '').trim().toLowerCase(),
    subject: String(ticket?.subject || '').trim(),
    status: normalizeStatus(ticket?.status),
    createdAt,
    updatedAt,
    closedAt,
    closedByUserId: ticket?.closedByUserId ? String(ticket.closedByUserId) : null,
    messages,
  };
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  const key = process.env.SUPPORT_KV_KEY?.trim() || 'n8n:support';
  if (!url || !token) return null;
  return { url, token, key };
}

async function runKvCommand(args) {
  const kv = getKvConfig();
  if (!kv) return { ok: false, result: null };

  const response = await fetch(kv.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`KV request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(`KV error: ${payload.error}`);
  }

  return { ok: true, result: payload?.result ?? null };
}

async function readFromKv() {
  const kv = getKvConfig();
  if (!kv) return null;

  const { result } = await runKvCommand(['GET', kv.key]);
  if (!result || typeof result !== 'string') return null;
  return normalizeSupportConfig(JSON.parse(result));
}

async function writeToKv(state) {
  const kv = getKvConfig();
  if (!kv) return false;
  await runKvCommand(['SET', kv.key, JSON.stringify(state)]);
  return true;
}

export function normalizeSupportConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const tickets = ensureArray(input.tickets)
    .map(normalizeTicket)
    .filter((ticket) => ticket.id && ticket.clientId && ticket.subject);

  return { tickets };
}

function getSupportPath() {
  const configured = process.env.SUPPORT_CONFIG_PATH?.trim();
  if (configured) return path.resolve(process.cwd(), configured);
  return path.resolve(process.cwd(), 'data', 'support.json');
}

async function readFromDisk(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return normalizeSupportConfig(JSON.parse(raw));
}

async function writeToDisk(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function readSupportConfig() {
  const kv = getKvConfig();
  if (kv) {
    try {
      const loaded = await readFromKv();
      if (loaded) {
        globalThis[memoryStateKey] = loaded;
        globalThis[kvStateKey] = 'kv';
        return loaded;
      }
    } catch {
      // Continue with disk/memory fallback.
    }
  } else if (globalThis[memoryStateKey]) {
    return normalizeSupportConfig(globalThis[memoryStateKey]);
  }

  const filePath = getSupportPath();
  try {
    const loaded = await readFromDisk(filePath);
    globalThis[memoryStateKey] = loaded;
    globalThis[kvStateKey] = 'disk';
    return loaded;
  } catch {
    if (globalThis[memoryStateKey]) {
      globalThis[kvStateKey] = 'memory';
      return normalizeSupportConfig(globalThis[memoryStateKey]);
    }

    const seeded = normalizeSupportConfig(DEFAULT_SUPPORT);
    globalThis[memoryStateKey] = seeded;
    globalThis[kvStateKey] = 'seed';
    return seeded;
  }
}

export async function writeSupportConfig(nextConfig) {
  const normalized = normalizeSupportConfig(nextConfig);
  globalThis[memoryStateKey] = normalized;

  try {
    const persistedInKv = await writeToKv(normalized);
    if (persistedInKv) {
      globalThis[kvStateKey] = 'kv';
      return normalized;
    }
  } catch {
    // Continue to disk fallback.
  }

  const filePath = getSupportPath();
  try {
    await writeToDisk(filePath, normalized);
    globalThis[kvStateKey] = 'disk';
  } catch {
    globalThis[kvStateKey] = 'memory';
  }

  return normalized;
}

export function getSupportPersistenceMode() {
  return globalThis[kvStateKey] || 'unknown';
}
