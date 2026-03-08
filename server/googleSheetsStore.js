import { google } from 'googleapis';

// ── Configuration ──────────────────────────────────────────────────────────────

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || '';
}

// ── Sheets Client (singleton) ──────────────────────────────────────────────────

let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// ── In-memory cache (10-second TTL) ────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL_MS = 10_000;

function getCached(tabName) {
  const entry = cache.get(tabName);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(tabName);
    return null;
  }
  return entry.data;
}

function setCache(tabName, data) {
  cache.set(tabName, { data, ts: Date.now() });
}

function invalidateCache(tabName) {
  cache.delete(tabName);
}

// ── Low-level Sheet helpers ────────────────────────────────────────────────────

async function readSheet(tabName) {
  const cached = getCached(tabName);
  if (cached) return cached;

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 1) return [];

  const headers = rows[0].map((h) => String(h || '').trim());
  const data = rows.slice(1).map((row, rowIndex) => {
    const obj = { __rowIndex: rowIndex + 2 }; // 1-based, +1 for header
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] !== undefined ? String(row[i]) : '';
    }
    return obj;
  });

  setCache(tabName, data);
  return data;
}

async function appendRow(tabName, rowObject, headers) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = headers.map((h) => rowObject[h] !== undefined ? String(rowObject[h]) : '');

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:Z`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });

  invalidateCache(tabName);
}

async function updateRow(tabName, rowIndex, rowObject, headers) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = headers.map((h) => rowObject[h] !== undefined ? String(rowObject[h]) : '');

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowIndex}:${String.fromCharCode(64 + headers.length)}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });

  invalidateCache(tabName);
}

function findByField(rows, field, value) {
  const target = String(value || '').trim();
  if (!target) return null;
  return rows.find((row) => String(row[field] || '').trim() === target) || null;
}

function findByFieldCI(rows, field, value) {
  const target = String(value || '').trim().toLowerCase();
  if (!target) return null;
  return rows.find((row) => String(row[field] || '').trim().toLowerCase() === target) || null;
}

// ── User Headers ───────────────────────────────────────────────────────────────

const USER_HEADERS = [
  'id', 'username', 'email', 'password_hash', 'auth_provider', 'google_id',
  'full_name', 'avatar_url', 'role', 'is_active', 'email_verified',
  'client_id', 'approval_status', 'created_at', 'updated_at', 'last_login_at',
];

const CLIENT_HEADERS = [
  'id', 'name', 'workflow_ids', 'onboarding_profile',
  'onboarding_submitted_at', 'created_at', 'updated_at',
];

const RESET_HEADERS = [
  'id', 'user_id', 'email', 'code', 'attempts', 'expires_at', 'used', 'created_at',
];

const AUDIT_HEADERS = [
  'id', 'user_id', 'action', 'meta', 'created_at',
];

// ── User CRUD ──────────────────────────────────────────────────────────────────

function sheetRowToUser(row) {
  return {
    id: row.id || '',
    username: row.username || '',
    email: (row.email || '').toLowerCase(),
    password: row.password_hash || '', // kept as "password" internally for compat
    authProvider: row.auth_provider || 'local',
    googleSub: row.google_id || '',
    authProviders: (row.auth_provider || 'local').split(',').map((s) => s.trim()).filter(Boolean),
    fullName: row.full_name || '',
    avatarUrl: row.avatar_url || '',
    role: row.role || 'client',
    isActive: row.is_active !== 'false',
    emailVerified: row.email_verified === 'true',
    clientId: row.client_id || '',
    approvalStatus: row.approval_status || 'approved',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lastLoginAt: row.last_login_at || '',
  };
}

function userToSheetRow(user) {
  return {
    id: user.id || '',
    username: user.username || '',
    email: (user.email || '').toLowerCase(),
    password_hash: user.password || user.password_hash || '',
    auth_provider: Array.isArray(user.authProviders) ? user.authProviders.join(',') : (user.authProvider || 'local'),
    google_id: user.googleSub || user.google_id || '',
    full_name: user.fullName || user.full_name || '',
    avatar_url: user.avatarUrl || user.avatar_url || '',
    role: user.role || 'client',
    is_active: String(user.isActive !== false),
    email_verified: String(user.emailVerified === true),
    client_id: user.clientId || user.client_id || '',
    approval_status: user.approvalStatus || user.approval_status || 'approved',
    created_at: user.createdAt || user.created_at || new Date().toISOString(),
    updated_at: user.updatedAt || user.updated_at || new Date().toISOString(),
    last_login_at: user.lastLoginAt || user.last_login_at || '',
  };
}

export async function findUserByEmail(email) {
  const rows = await readSheet('users');
  const row = findByFieldCI(rows, 'email', email);
  return row ? sheetRowToUser(row) : null;
}

export async function findUserById(userId) {
  const rows = await readSheet('users');
  const row = findByField(rows, 'id', userId);
  return row ? sheetRowToUser(row) : null;
}

export async function findUserByGoogleId(googleId) {
  const rows = await readSheet('users');
  const row = findByField(rows, 'google_id', googleId);
  return row ? sheetRowToUser(row) : null;
}

export async function getAllUsers() {
  const rows = await readSheet('users');
  return rows.map(sheetRowToUser);
}

export async function createUser(userData) {
  const sheetRow = userToSheetRow({
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await appendRow('users', sheetRow, USER_HEADERS);
  return sheetRowToUser(sheetRow);
}

export async function updateUser(userId, partialData) {
  const rows = await readSheet('users');
  const row = findByField(rows, 'id', userId);
  if (!row) return null;

  const current = sheetRowToUser(row);
  const merged = { ...current, ...partialData, updatedAt: new Date().toISOString() };
  const sheetRow = userToSheetRow(merged);

  await updateRow('users', row.__rowIndex, sheetRow, USER_HEADERS);
  return sheetRowToUser(sheetRow);
}

// ── Client CRUD ────────────────────────────────────────────────────────────────

function sheetRowToClient(row) {
  let onboardingProfile = null;
  try {
    onboardingProfile = row.onboarding_profile ? JSON.parse(row.onboarding_profile) : null;
  } catch {
    onboardingProfile = null;
  }

  return {
    id: row.id || '',
    name: row.name || '',
    workflowIds: (row.workflow_ids || '').split(',').map((s) => s.trim()).filter(Boolean),
    onboardingProfile,
    onboardingSubmittedAt: row.onboarding_submitted_at || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function clientToSheetRow(client) {
  return {
    id: client.id || '',
    name: client.name || '',
    workflow_ids: Array.isArray(client.workflowIds) ? client.workflowIds.join(',') : (client.workflow_ids || ''),
    onboarding_profile: client.onboardingProfile ? JSON.stringify(client.onboardingProfile) : '',
    onboarding_submitted_at: client.onboardingSubmittedAt || '',
    created_at: client.createdAt || client.created_at || new Date().toISOString(),
    updated_at: client.updatedAt || client.updated_at || new Date().toISOString(),
  };
}

export async function findClientById(clientId) {
  const rows = await readSheet('clients');
  const row = findByField(rows, 'id', clientId);
  return row ? sheetRowToClient(row) : null;
}

export async function getAllClients() {
  const rows = await readSheet('clients');
  return rows.map(sheetRowToClient);
}

export async function createClient(data) {
  const sheetRow = clientToSheetRow({
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await appendRow('clients', sheetRow, CLIENT_HEADERS);
  return sheetRowToClient(sheetRow);
}

export async function updateClient(clientId, partialData) {
  const rows = await readSheet('clients');
  const row = findByField(rows, 'id', clientId);
  if (!row) return null;

  const current = sheetRowToClient(row);
  const merged = { ...current, ...partialData, updatedAt: new Date().toISOString() };
  const sheetRow = clientToSheetRow(merged);

  await updateRow('clients', row.__rowIndex, sheetRow, CLIENT_HEADERS);
  return sheetRowToClient(sheetRow);
}

// ── Password Reset ─────────────────────────────────────────────────────────────

export async function createPasswordReset(data) {
  const sheetRow = {
    id: data.id || `reset-${Date.now().toString(36)}`,
    user_id: data.userId || '',
    email: (data.email || '').toLowerCase(),
    code: data.code || '',
    attempts: String(data.attempts || 0),
    expires_at: data.expiresAt || new Date(Date.now() + 10 * 60_000).toISOString(),
    used: 'false',
    created_at: new Date().toISOString(),
  };
  await appendRow('password_resets', sheetRow, RESET_HEADERS);
  return sheetRow;
}

export async function findPasswordReset(email) {
  const rows = await readSheet('password_resets');
  const target = (email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  // Find latest unused, non-expired reset for this email
  const matching = rows
    .filter((r) => r.email.toLowerCase() === target && r.used !== 'true' && r.expires_at > now)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return matching[0] || null;
}

export async function markPasswordResetUsed(resetRow) {
  if (!resetRow?.__rowIndex) return;
  const updated = { ...resetRow, used: 'true' };
  await updateRow('password_resets', resetRow.__rowIndex, updated, RESET_HEADERS);
}

export async function incrementResetAttempts(resetRow) {
  if (!resetRow?.__rowIndex) return;
  const updated = { ...resetRow, attempts: String((parseInt(resetRow.attempts, 10) || 0) + 1) };
  await updateRow('password_resets', resetRow.__rowIndex, updated, RESET_HEADERS);
}

// ── Audit Log ──────────────────────────────────────────────────────────────────

export async function createAuditLog(data) {
  const sheetRow = {
    id: `audit-${Date.now().toString(36)}`,
    user_id: data.userId || '',
    action: data.action || '',
    meta: data.meta ? JSON.stringify(data.meta) : '',
    created_at: new Date().toISOString(),
  };

  // Fire and forget — don't block the caller
  appendRow('audit_logs', sheetRow, AUDIT_HEADERS).catch((err) => {
    console.error('[AuditLog] Failed to write:', err?.message || err);
  });
}

// ── RBAC Compatibility Layer ───────────────────────────────────────────────────
// Drop-in replacement for rbacStore.readRbacConfig / writeRbacConfig

export async function readRbacConfig() {
  const [users, clients] = await Promise.all([getAllUsers(), getAllClients()]);
  return { users, clients };
}

export async function writeRbacConfig(config) {
  const { users: nextUsers = [], clients: nextClients = [] } = config;

  // Read current state from Sheets
  const [currentUserRows, currentClientRows] = await Promise.all([
    readSheet('users'),
    readSheet('clients'),
  ]);

  const existingUserIds = new Set(currentUserRows.map((r) => r.id));
  const existingClientIds = new Set(currentClientRows.map((r) => r.id));

  // Process users: update existing, create new
  for (const user of nextUsers) {
    if (existingUserIds.has(user.id)) {
      await updateUser(user.id, user);
    } else {
      await createUser(user);
    }
  }

  // Process clients: update existing, create new
  for (const client of nextClients) {
    if (existingClientIds.has(client.id)) {
      await updateClient(client.id, client);
    } else {
      await createClient(client);
    }
  }

  // Invalidate caches and re-read
  invalidateCache('users');
  invalidateCache('clients');

  return readRbacConfig();
}

// ── Google Sheets availability check ───────────────────────────────────────────

export function isGoogleSheetsConfigured() {
  return Boolean(getServiceAccountCredentials() && getSpreadsheetId());
}
