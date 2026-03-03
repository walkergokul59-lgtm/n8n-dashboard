import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_RBAC = {
  users: [
    { id: 'user-admin', email: 'root@gmail.com', password: 'root', role: 'admin', clientId: 'admin' },
    { id: 'user-client1', email: 'client1@gmail.com', password: 'client1', role: 'client', clientId: 'client1' },
  ],
  clients: [{ id: 'client1', name: 'Client 1', workflowIds: [] }],
};

const memoryStateKey = '__n8n_dashboard_rbac__';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return [...new Set(ensureArray(values).map((v) => String(v).trim()).filter(Boolean))];
}

export function normalizeRbacConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};

  const users = ensureArray(input.users).map((user, index) => ({
    id: String(user?.id || `user-${index + 1}`),
    email: String(user?.email || '').trim().toLowerCase(),
    password: String(user?.password || ''),
    role: String(user?.role || 'client'),
    clientId: String(user?.clientId || ''),
  })).filter((user) => user.email);

  const clients = ensureArray(input.clients).map((client, index) => ({
    id: String(client?.id || `client-${index + 1}`),
    name: String(client?.name || client?.id || `Client ${index + 1}`),
    workflowIds: uniqueStrings(client?.workflowIds),
  })).filter((client) => client.id);

  const hasAdmin = users.some((user) => user.role === 'admin' && user.email === 'root@gmail.com');
  if (!hasAdmin) {
    users.unshift({ id: 'user-admin', email: 'root@gmail.com', password: 'root', role: 'admin', clientId: 'admin' });
  }

  const hasClient1 = users.some((user) => user.email === 'client1@gmail.com');
  if (!hasClient1) {
    users.push({ id: 'user-client1', email: 'client1@gmail.com', password: 'client1', role: 'client', clientId: 'client1' });
  }

  const hasClientEntry = clients.some((client) => client.id === 'client1');
  if (!hasClientEntry) {
    clients.push({ id: 'client1', name: 'Client 1', workflowIds: [] });
  }

  return { users, clients };
}

function getRbacPath() {
  const configured = process.env.RBAC_CONFIG_PATH?.trim();
  if (configured) return path.resolve(process.cwd(), configured);
  return path.resolve(process.cwd(), 'data', 'rbac.json');
}

async function readFromDisk(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return normalizeRbacConfig(JSON.parse(raw));
}

async function writeToDisk(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function readRbacConfig() {
  if (globalThis[memoryStateKey]) {
    return normalizeRbacConfig(globalThis[memoryStateKey]);
  }

  const filePath = getRbacPath();
  try {
    const loaded = await readFromDisk(filePath);
    globalThis[memoryStateKey] = loaded;
    return loaded;
  } catch {
    const fallback = normalizeRbacConfig(DEFAULT_RBAC);
    globalThis[memoryStateKey] = fallback;
    return fallback;
  }
}

export async function writeRbacConfig(nextConfig) {
  const normalized = normalizeRbacConfig(nextConfig);
  globalThis[memoryStateKey] = normalized;

  const filePath = getRbacPath();
  try {
    await writeToDisk(filePath, normalized);
  } catch {
    // Vercel serverless filesystem is read-only; memory fallback remains active.
  }

  return normalized;
}

export function sanitizeRbacConfigForAdmin(config) {
  return {
    users: ensureArray(config?.users).map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      password: user.password || '',
    })),
    clients: ensureArray(config?.clients).map((client) => ({
      id: client.id,
      name: client.name,
      workflowIds: uniqueStrings(client.workflowIds),
    })),
  };
}

