import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeApprovalStatus } from './accessControl.js';

function emptyOnboardingProfile() {
  return {
    clientName: '',
    contactNumber: '',
    businessName: '',
    primaryEmail: '',
    secondaryEmail: '',
    profileImage: '',
  };
}

function normalizeOnboardingProfile(input) {
  const source = input && typeof input === 'object' ? input : {};
  const empty = emptyOnboardingProfile();
  return {
    clientName: String(source.clientName || empty.clientName).trim(),
    contactNumber: String(source.contactNumber || empty.contactNumber).trim(),
    businessName: String(source.businessName || empty.businessName).trim(),
    primaryEmail: String(source.primaryEmail || empty.primaryEmail).trim(),
    secondaryEmail: String(source.secondaryEmail || empty.secondaryEmail).trim(),
    profileImage: String(source.profileImage || empty.profileImage),
  };
}

const DEFAULT_RBAC = {
  users: [
    {
      id: 'user-admin',
      email: 'root@gmail.com',
      password: 'root',
      role: 'admin',
      clientId: 'admin',
      approvalStatus: 'approved',
    },
    {
      id: 'user-client1',
      email: 'client1@gmail.com',
      password: 'client1',
      role: 'client',
      clientId: 'client1',
      approvalStatus: 'approved',
    },
  ],
  clients: [
    {
      id: 'client1',
      name: 'Client 1',
      workflowIds: [],
      onboardingProfile: emptyOnboardingProfile(),
      onboardingSubmittedAt: null,
    },
  ],
};

const memoryStateKey = '__n8n_dashboard_rbac__';
const kvStateKey = '__n8n_dashboard_rbac_kv__';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return [...new Set(ensureArray(values).map((v) => String(v).trim()).filter(Boolean))];
}

export function getKvConfig() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  const key = process.env.RBAC_KV_KEY?.trim() || 'n8n:rbac';
  if (!url || !token) return null;
  return { url, token, key };
}

export async function runKvCommand(args) {
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
  return normalizeRbacConfig(JSON.parse(result));
}

async function writeToKv(state) {
  const kv = getKvConfig();
  if (!kv) return false;
  await runKvCommand(['SET', kv.key, JSON.stringify(state)]);
  return true;
}

export function normalizeRbacConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};

  const users = ensureArray(input.users).map((user, index) => ({
    id: String(user?.id || `user-${index + 1}`),
    email: String(user?.email || '').trim().toLowerCase(),
    password: String(user?.password || ''),
    role: String(user?.role || 'client'),
    clientId: String(user?.clientId || ''),
    approvalStatus: normalizeApprovalStatus(user?.approvalStatus, 'approved'),
  })).filter((user) => user.email);

  const clients = ensureArray(input.clients).map((client, index) => ({
    id: String(client?.id || `client-${index + 1}`),
    name: String(client?.name || client?.id || `Client ${index + 1}`),
    workflowIds: uniqueStrings(client?.workflowIds),
    onboardingProfile: normalizeOnboardingProfile(client?.onboardingProfile),
    onboardingSubmittedAt: client?.onboardingSubmittedAt ? String(client.onboardingSubmittedAt) : null,
  })).filter((client) => client.id);

  const hasAdmin = users.some((user) => user.role === 'admin' && user.email === 'root@gmail.com');
  if (!hasAdmin) {
    users.unshift({
      id: 'user-admin',
      email: 'root@gmail.com',
      password: 'root',
      role: 'admin',
      clientId: 'admin',
      approvalStatus: 'approved',
    });
  }

  const hasClient1 = users.some((user) => user.email === 'client1@gmail.com');
  if (!hasClient1) {
    users.push({
      id: 'user-client1',
      email: 'client1@gmail.com',
      password: 'client1',
      role: 'client',
      clientId: 'client1',
      approvalStatus: 'approved',
    });
  }

  const hasClientEntry = clients.some((client) => client.id === 'client1');
  if (!hasClientEntry) {
    clients.push({
      id: 'client1',
      name: 'Client 1',
      workflowIds: [],
      onboardingProfile: emptyOnboardingProfile(),
      onboardingSubmittedAt: null,
    });
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
    return normalizeRbacConfig(globalThis[memoryStateKey]);
  }

  const filePath = getRbacPath();
  try {
    const loaded = await readFromDisk(filePath);
    globalThis[memoryStateKey] = loaded;
    globalThis[kvStateKey] = 'disk';
    return loaded;
  } catch {
    if (globalThis[memoryStateKey]) {
      globalThis[kvStateKey] = 'memory';
      return normalizeRbacConfig(globalThis[memoryStateKey]);
    }
    const seeded = normalizeRbacConfig(DEFAULT_RBAC);
    globalThis[memoryStateKey] = seeded;
    globalThis[kvStateKey] = 'seed';
    return seeded;
  }
}

export async function writeRbacConfig(nextConfig) {
  const normalized = normalizeRbacConfig(nextConfig);
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

  const filePath = getRbacPath();
  try {
    await writeToDisk(filePath, normalized);
    globalThis[kvStateKey] = 'disk';
  } catch {
    // Vercel serverless filesystem is read-only; memory fallback remains active.
    globalThis[kvStateKey] = 'memory';
  }

  return normalized;
}

export function getRbacPersistenceMode() {
  return globalThis[kvStateKey] || 'unknown';
}

export function sanitizeRbacConfigForAdmin(config) {
  return {
    users: ensureArray(config?.users).map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      approvalStatus: normalizeApprovalStatus(user.approvalStatus, 'approved'),
      password: user.password || '',
    })),
    clients: ensureArray(config?.clients).map((client) => ({
      id: client.id,
      name: client.name,
      workflowIds: uniqueStrings(client.workflowIds),
      onboardingProfile: normalizeOnboardingProfile(client.onboardingProfile),
      onboardingSubmittedAt: client?.onboardingSubmittedAt ? String(client.onboardingSubmittedAt) : null,
    })),
  };
}
