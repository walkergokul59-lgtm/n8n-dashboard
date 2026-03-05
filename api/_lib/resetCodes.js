import crypto from 'node:crypto';
import { issueToken, verifyToken } from '../../server/tokenAuth.js';
import { readRbacConfig } from '../../server/rbacStore.js';
import { findUserByEmail } from '../../server/accessControl.js';

const AUTH_SECRET = () => process.env.APP_AUTH_SECRET || 'change-this-secret';

// In-memory fallback when KV is not configured
const memoryStore = new Map();

function getKvConfig() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
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

export function generateResetCode() {
  return String(crypto.randomInt(100000, 999999));
}

function resetKey(email) {
  return `n8n:reset:${email.trim().toLowerCase()}`;
}

export async function storeResetCode(email, code) {
  const key = resetKey(email);
  const value = { code, attempts: 0, createdAt: Date.now() };

  const kv = getKvConfig();
  if (kv) {
    await runKvCommand(['SET', key, JSON.stringify(value), 'EX', 600]);
  } else {
    memoryStore.set(key, value);
    // Auto-expire after 10 minutes
    setTimeout(() => {
      if (memoryStore.get(key) === value) memoryStore.delete(key);
    }, 600_000);
  }
}

export async function getResetCode(email) {
  const key = resetKey(email);

  const kv = getKvConfig();
  if (kv) {
    const { result } = await runKvCommand(['GET', key]);
    if (!result || typeof result !== 'string') return null;
    return JSON.parse(result);
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  // Check manual expiry for memory store
  if (Date.now() - entry.createdAt > 600_000) {
    memoryStore.delete(key);
    return null;
  }
  return entry;
}

export async function incrementAttempts(email, data) {
  const key = resetKey(email);
  const updated = { ...data, attempts: (data.attempts || 0) + 1 };

  const kv = getKvConfig();
  if (kv) {
    // Preserve remaining TTL by using KEEPTTL
    await runKvCommand(['SET', key, JSON.stringify(updated), 'KEEPTTL']);
  } else {
    memoryStore.set(key, updated);
  }
}

export async function deleteResetCode(email) {
  const key = resetKey(email);

  const kv = getKvConfig();
  if (kv) {
    await runKvCommand(['DEL', key]);
  } else {
    memoryStore.delete(key);
  }
}

export function issueResetToken(email) {
  return issueToken(
    { purpose: 'password-reset', email: email.trim().toLowerCase() },
    AUTH_SECRET(),
    5 * 60 // 5 minutes
  );
}

export function verifyResetToken(token) {
  const payload = verifyToken(token, AUTH_SECRET());
  if (!payload) return null;
  if (payload.purpose !== 'password-reset') return null;
  if (!payload.email) return null;
  return { email: payload.email };
}

export async function findUserForReset(email) {
  const config = await readRbacConfig();
  return findUserByEmail(config, email);
}
