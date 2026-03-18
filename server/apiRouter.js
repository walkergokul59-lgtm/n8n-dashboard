import bcrypt from 'bcryptjs';
import {
  applyWorkflowSelection,
  applyTierWorkflowLimit,
  authenticateUser,
  computeEffectiveTier,
  findUserByEmail,
  findUserById,
  getAllowedWorkflowIds,
  hasFeature,
  isUserApproved,
  normalizeApprovalStatus,
} from './accessControl.js';
import {
  findUserForReset,
  issueResetToken,
  verifyResetToken,
} from '../api/_lib/resetCodes.js';
import { sendResetCodeEmail } from '../api/_lib/email.js';
import { callN8nWebhook } from '../api/_lib/n8n-webhook.js';
import {
  addSupportTicketMessage,
  closeSupportTicket,
  createSupportTicket,
  listSupportTickets,
  readSupportTicket,
} from '../api/_lib/support.js';
import { buildOverview, checkHealth, countExecutionsInRange, listRecentExecutions, listWorkflows } from './dashboardCore.js';
import { readRbacConfig, sanitizeRbacConfigForAdmin, writeRbacConfig } from './rbacStore.js';
import { extractBearerTokenFromHeaders, issueToken, verifyToken } from './tokenAuth.js';
import { getQueryParam, readJsonBody, sendJson } from './httpUtils.js';
import { createAuditLog, isGoogleSheetsConfigured } from './googleSheetsStore.js';

const AUTH_SECRET = () => process.env.APP_AUTH_SECRET || 'change-this-secret';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Rate Limiting ──────────────────────────────────────────────────────────────

const rateLimitStore = new Map();

function rateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateLimitStore.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (entry.count > maxAttempts) return true;
  return false;
}

function getClientIp(req) {
  return req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

// Clean up rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > 120_000) rateLimitStore.delete(key);
  }
}, 300_000).unref?.();

function emptyOnboardingProfile() {
  return {
    clientName: '',
    contactCountryCode: '+91',
    contactNumber: '',
    businessName: '',
    primaryEmail: '',
    secondaryEmail: '',
    profileImage: '',
  };
}

function normalizeOnboardingProfile(input) {
  const source = input && typeof input === 'object' ? input : {};
  const base = emptyOnboardingProfile();
  return {
    clientName: String(source.clientName || base.clientName).trim(),
    contactCountryCode: String(source.contactCountryCode || base.contactCountryCode).trim(),
    contactNumber: String(source.contactNumber || base.contactNumber).trim(),
    businessName: String(source.businessName || base.businessName).trim(),
    primaryEmail: String(source.primaryEmail || base.primaryEmail).trim(),
    secondaryEmail: String(source.secondaryEmail || base.secondaryEmail).trim(),
    profileImage: String(source.profileImage || base.profileImage),
  };
}

function createId(prefix) {
  const now = Date.now();
  const random = Math.floor(Math.random() * 1000000).toString(36);
  return `${prefix}-${now.toString(36)}${random}`;
}

function toClientIdSeed(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextClientId(seedValue, existingIds) {
  const seed = toClientIdSeed(seedValue) || 'client';
  if (!existingIds.has(seed)) return seed;
  let counter = 2;
  while (existingIds.has(`${seed}-${counter}`)) {
    counter += 1;
  }
  return `${seed}-${counter}`;
}

function tokenFromReq(req) {
  const headerToken = extractBearerTokenFromHeaders(req.headers || {});
  if (headerToken) return headerToken;
  return getQueryParam(req.url, 'token');
}

function matchSupportTicketId(pathname, action = '') {
  const normalizedAction = action ? `/${action}` : '';
  const match = pathname.match(new RegExp(`^/api/support/([^/]+)${normalizedAction}$`));
  return match ? decodeURIComponent(match[1]) : '';
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

  let effectiveTier = 'free';
  if (user.role !== 'admin') {
    const client = (config.clients || []).find((c) => String(c.id) === String(user.clientId));
    effectiveTier = computeEffectiveTier(client);
  }
  return { user, config, effectiveTier };
}

function userView(user, effectiveTier = 'free') {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    approvalStatus: normalizeApprovalStatus(user.approvalStatus, 'approved'),
    effectiveTier,
    features: {
      failures24h: user.role === 'admin' || hasFeature(effectiveTier, 'failures24h'),
      exportCsv:   user.role === 'admin' || hasFeature(effectiveTier, 'exportCsv'),
      supportChat: user.role === 'admin' || hasFeature(effectiveTier, 'supportChat'),
      invoiceRuns: user.role === 'admin' || hasFeature(effectiveTier, 'invoiceRuns'),
    },
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
        const clientIp = getClientIp(req);
        if (rateLimit(`login:${clientIp}`, 5, 60_000)) {
          sendJson(res, 429, { error: 'Too many login attempts. Please try again later.' });
          return true;
        }

        const body = await readJsonBody(req);
        const config = await readRbacConfig();
        const user = await authenticateUser(config, body.email, body.password);
        if (!user) {
          sendJson(res, 401, { error: 'Invalid email or password' });
          return true;
        }

        // Rehash legacy plaintext password to bcrypt
        if (user._needsRehash) {
          const hashed = bcrypt.hashSync(String(body.password), 10);
          const users = (config.users || []).map((u) =>
            String(u.id) === String(user.id) ? { ...u, password: hashed } : u
          );
          writeRbacConfig({ ...config, users }).catch(() => {});
        }

        if (isGoogleSheetsConfigured()) {
          createAuditLog({ userId: user.id, action: 'login', meta: { email: user.email } });
        }

        let loginEffectiveTier = 'free';
        if (user.role !== 'admin') {
          const client = (config.clients || []).find((c) => String(c.id) === String(user.clientId));
          loginEffectiveTier = computeEffectiveTier(client);
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
        sendJson(res, 200, { token, user: userView(user, loginEffectiveTier) });
        return true;
      }

      if (pathname === '/api/auth/signup' && method === 'POST') {
        const clientIp = getClientIp(req);
        if (rateLimit(`signup:${clientIp}`, 3, 60_000)) {
          sendJson(res, 429, { error: 'Too many signup attempts. Please try again later.' });
          return true;
        }

        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();
        const password = String(body?.password || '');
        const clientName = String(body?.clientName || '').trim();

        if (!EMAIL_PATTERN.test(email)) {
          sendJson(res, 400, { error: 'Enter a valid email address' });
          return true;
        }
        if (password.length < 4) {
          sendJson(res, 400, { error: 'Password must be at least 4 characters long' });
          return true;
        }

        const config = await readRbacConfig();
        if (findUserByEmail(config, email)) {
          sendJson(res, 409, { error: 'Email is already registered' });
          return true;
        }

        const localPart = email.split('@')[0] || '';
        const existingClientIds = new Set((config.clients || []).map((client) => String(client.id)));
        const nextClient = {
          id: nextClientId(clientName || localPart, existingClientIds),
          name: clientName || localPart || 'New Client',
          workflowIds: [],
          onboardingProfile: emptyOnboardingProfile(),
          onboardingSubmittedAt: null,
          tier: 'free',
          tierSetAt: null,
        };
        const hashedPassword = bcrypt.hashSync(password, 10);
        const nextUser = {
          id: createId('user'),
          email,
          password: hashedPassword,
          role: 'client',
          clientId: nextClient.id,
          approvalStatus: 'pending',
        };

        const saved = await writeRbacConfig({
          users: [...(config.users || []), nextUser],
          clients: [...(config.clients || []), nextClient],
        });

        const createdUser = findUserById(saved, nextUser.id);
        if (!createdUser) {
          sendJson(res, 500, { error: 'Failed to create signup account' });
          return true;
        }

        if (isGoogleSheetsConfigured()) {
          createAuditLog({ userId: createdUser.id, action: 'signup', meta: { email } });
        }

        const token = issueToken(
          {
            sub: createdUser.id,
            role: createdUser.role,
            email: createdUser.email,
            clientId: createdUser.clientId,
          },
          AUTH_SECRET(),
          60 * 60 * 24
        );

        sendJson(res, 201, { token, user: userView(createdUser, 'free') });
        return true;
      }

      if (pathname === '/api/auth/reset-request' && method === 'POST') {
        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();

        if (rateLimit(`reset:${email}`, 3, 60_000)) {
          sendJson(res, 200, { message: 'If an account with that email exists, a reset code has been sent.' });
          return true;
        }

        if (!EMAIL_PATTERN.test(email)) {
          sendJson(res, 400, { error: 'Enter a valid email address' });
          return true;
        }

        const successResponse = { message: 'If an account with that email exists, a reset code has been sent.' };

        const user = await findUserForReset(email);
        if (!user) {
          sendJson(res, 200, successResponse);
          return true;
        }

        await sendResetCodeEmail(email);

        sendJson(res, 200, successResponse);
        return true;
      }

      if (pathname === '/api/auth/reset-verify' && method === 'POST') {
        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();
        const otp = String(body?.code || body?.otp || '').trim();

        if (!EMAIL_PATTERN.test(email) || !otp) {
          sendJson(res, 400, { error: 'Email and OTP are required' });
          return true;
        }

        const result = await callN8nWebhook('/webhook/OTP_Verify', { email, otp });

        if (!result.ok) {
          const message = result.data?.message || 'Invalid or expired code';
          sendJson(res, 400, { error: message });
          return true;
        }

        if (result.data && result.data.success === false) {
          const message = result.data?.message || 'Invalid or expired code';
          sendJson(res, 400, { error: message });
          return true;
        }

        const resetToken = issueResetToken(email);
        sendJson(res, 200, { resetToken });
        return true;
      }

      if (pathname === '/api/auth/reset-password' && method === 'POST') {
        const body = await readJsonBody(req);
        const resetTokenValue = String(body?.resetToken || '').trim();
        const newPassword = String(body?.newPassword || '');

        if (!resetTokenValue) {
          sendJson(res, 400, { error: 'Reset token is required' });
          return true;
        }

        const tokenData = verifyResetToken(resetTokenValue);
        if (!tokenData) {
          sendJson(res, 400, { error: 'Invalid or expired reset token. Please start over.' });
          return true;
        }

        if (newPassword.length < 4) {
          sendJson(res, 400, { error: 'Password must be at least 4 characters long' });
          return true;
        }

        const config = await readRbacConfig();
        const user = findUserByEmail(config, tokenData.email);
        if (!user) {
          sendJson(res, 400, { error: 'User account not found' });
          return true;
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        const users = (config.users || []).map((u) =>
          String(u.id) === String(user.id) ? { ...u, password: hashedPassword } : u
        );
        await writeRbacConfig({ ...config, users });

        if (isGoogleSheetsConfigured()) {
          createAuditLog({ userId: user.id, action: 'password_reset', meta: { email: tokenData.email } });
        }

        // Fire-and-forget: notify n8n to update its sheet and send confirmation email
        callN8nWebhook('/webhook/new_password', { email: tokenData.email, password: newPassword }).catch((err) => {
          console.error('[Password Reset] n8n new_password webhook error:', err?.message || String(err));
        });

        sendJson(res, 200, { message: 'Password has been reset successfully.' });
        return true;
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        sendJson(res, 200, { user: userView(auth.user, auth.effectiveTier) });
        return true;
      }

      if (pathname === '/api/client/settings' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        if (auth.user.role === 'admin') {
          sendJson(res, 403, { error: 'Admin users do not have client onboarding settings' });
          return true;
        }
        const currentClient = (auth.config.clients || []).find((client) => String(client.id) === String(auth.user.clientId || ''));
        sendJson(res, 200, {
          clientId: auth.user.clientId || '',
          approvalStatus: normalizeApprovalStatus(auth.user.approvalStatus, 'approved'),
          profile: normalizeOnboardingProfile(currentClient?.onboardingProfile),
        });
        return true;
      }

      if (pathname === '/api/client/settings' && method === 'PUT') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        if (auth.user.role === 'admin') {
          sendJson(res, 403, { error: 'Admin users do not have client onboarding settings' });
          return true;
        }

        const body = await readJsonBody(req);
        const profile = normalizeOnboardingProfile(body || {});
        const primaryEmail = String(profile.primaryEmail || '').trim().toLowerCase();
        const secondaryEmail = String(profile.secondaryEmail || '').trim().toLowerCase();
        const contactCountryCode = String(profile.contactCountryCode || '').trim();
        const contactNumber = String(profile.contactNumber || '').trim();
        if (!/^\+\d{1,4}$/.test(contactCountryCode)) {
          sendJson(res, 400, { error: 'Country code is required in +<digits> format.' });
          return true;
        }
        if (!/^\d{10}$/.test(contactNumber)) {
          sendJson(res, 400, { error: 'Contact number must be exactly 10 digits.' });
          return true;
        }
        if (primaryEmail && secondaryEmail && primaryEmail === secondaryEmail) {
          sendJson(res, 400, { error: 'Primary and secondary emails must be different.' });
          return true;
        }
        const users = [...(auth.config.users || [])];
        const clients = [...(auth.config.clients || [])];
        const clientIndex = clients.findIndex((client) => String(client.id) === String(auth.user.clientId || ''));
        const nextClientData = {
          id: auth.user.clientId || createId('client'),
          name: profile.clientName || (clients[clientIndex]?.name || 'New Client'),
          workflowIds: clients[clientIndex]?.workflowIds || [],
          onboardingProfile: profile,
          onboardingSubmittedAt: new Date().toISOString(),
        };

        if (clientIndex >= 0) {
          clients[clientIndex] = { ...clients[clientIndex], ...nextClientData };
        } else {
          clients.push(nextClientData);
        }

        const userIndex = users.findIndex((user) => String(user.id) === String(auth.user.id));
        if (userIndex >= 0) {
          users[userIndex] = {
            ...users[userIndex],
            approvalStatus: normalizeApprovalStatus(users[userIndex].approvalStatus, 'pending'),
          };
        }

        const saved = await writeRbacConfig({ users, clients });
        const savedUser = findUserById(saved, auth.user.id);
        const savedClient = (saved.clients || []).find((client) => String(client.id) === String(savedUser?.clientId || auth.user.clientId || ''));

        sendJson(res, 200, {
          user: savedUser ? userView(savedUser) : null,
          clientId: savedUser?.clientId || auth.user.clientId || '',
          approvalStatus: normalizeApprovalStatus(savedUser?.approvalStatus, 'pending'),
          profile: normalizeOnboardingProfile(savedClient?.onboardingProfile),
        });
        return true;
      }

      if (pathname === '/api/support' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;

        sendJson(res, 200, await listSupportTickets(auth.user, {
          status: url.searchParams.get('status'),
        }));
        return true;
      }

      if (pathname === '/api/support' && method === 'POST') {
        const auth = await requireUser(req, res);
        if (!auth) return true;

        const body = await readJsonBody(req);
        sendJson(res, 201, await createSupportTicket(auth.user, body || {}, req));
        return true;
      }

      const supportTicketId = matchSupportTicketId(pathname);
      if (supportTicketId && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;

        sendJson(res, 200, await readSupportTicket(auth.user, supportTicketId));
        return true;
      }

      const supportMessageTicketId = matchSupportTicketId(pathname, 'messages');
      if (supportMessageTicketId && method === 'POST') {
        const auth = await requireUser(req, res);
        if (!auth) return true;

        const body = await readJsonBody(req);
        sendJson(res, 200, await addSupportTicketMessage(auth.user, supportMessageTicketId, body || {}));
        return true;
      }

      const supportCloseTicketId = matchSupportTicketId(pathname, 'close');
      if (supportCloseTicketId && method === 'POST') {
        const auth = await requireUser(req, res);
        if (!auth) return true;

        sendJson(res, 200, await closeSupportTicket(auth.user, supportCloseTicketId));
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
        if (!isUserApproved(auth.user)) {
          sendJson(res, 403, { error: 'Account pending admin approval. Please complete onboarding in Settings and wait for approval.' });
          return true;
        }
        const baseAllowedWorkflowIds = getAllowedWorkflowIds(auth.config, auth.user);
        const tierCapped = applyTierWorkflowLimit(baseAllowedWorkflowIds, auth.effectiveTier);
        const selectedWorkflowIds = getQueryParam(req.url, 'workflowIds');
        const access = {
          allowedWorkflowIds: applyWorkflowSelection(tierCapped, selectedWorkflowIds),
        };

        if (pathname === '/api/dashboard/overview' && method === 'GET') {
          const raw = await buildOverview(n8n, access);
          const canSeeFailures = auth.user.role === 'admin' || hasFeature(auth.effectiveTier, 'failures24h');
          sendJson(res, 200, { ...raw, failures24h: canSeeFailures ? raw.failures24h : undefined });
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

          const canSeeFailuresStream = auth.user.role === 'admin' || hasFeature(auth.effectiveTier, 'failures24h');
          const sendOverview = async () => {
            try {
              const raw = await buildOverview(n8n, access);
              send('overview', { ...raw, failures24h: canSeeFailuresStream ? raw.failures24h : undefined });
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
