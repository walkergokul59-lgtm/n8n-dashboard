import {
  applyWorkflowSelection,
  authenticateUser,
  findUserByEmail,
  findUserById,
  getAllowedWorkflowIds,
  isUserApproved,
  normalizeApprovalStatus,
} from './accessControl.js';
import {
  findUserForReset,
  generateResetCode,
  getResetCode,
  storeResetCode,
  incrementAttempts,
  deleteResetCode,
  issueResetToken,
  verifyResetToken,
} from '../api/_lib/resetCodes.js';
import { loginWithGoogle, signupClientUserWithGoogle } from '../api/_lib/auth.js';
import { sendResetCodeEmail } from '../api/_lib/email.js';
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

const AUTH_SECRET = () => process.env.APP_AUTH_SECRET || 'change-this-secret';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return { user, config };
}

function userView(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    approvalStatus: normalizeApprovalStatus(user.approvalStatus, 'approved'),
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
        const body = await readJsonBody(req);
        const config = await readRbacConfig();
        const user = authenticateUser(config, body.email, body.password);
        if (!user) {
          sendJson(res, 401, { error: 'Invalid email or password' });
          return true;
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
        sendJson(res, 200, { token, user: userView(user) });
        return true;
      }

      if (pathname === '/api/auth/signup' && method === 'POST') {
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
        };
        const nextUser = {
          id: createId('user'),
          email,
          password,
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

        sendJson(res, 201, { token, user: userView(createdUser) });
        return true;
      }

      if (pathname === '/api/auth/google' && method === 'POST') {
        const body = await readJsonBody(req);
        const mode = String(body?.mode || 'signin').trim().toLowerCase();
        const credential = String(body?.credential || '').trim();
        const clientName = String(body?.clientName || '').trim();

        if (!credential) {
          sendJson(res, 400, { error: 'Google credential is required' });
          return true;
        }

        if (mode === 'signup') {
          sendJson(res, 201, await signupClientUserWithGoogle({ credential, clientName }));
          return true;
        }

        if (mode !== 'signin') {
          sendJson(res, 400, { error: 'Invalid Google auth mode' });
          return true;
        }

        sendJson(res, 200, await loginWithGoogle(credential));
        return true;
      }

      if (pathname === '/api/auth/reset-request' && method === 'POST') {
        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();

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

        const existing = await getResetCode(email);
        if (existing && Date.now() - existing.createdAt < 60_000) {
          sendJson(res, 200, successResponse);
          return true;
        }

        const code = generateResetCode();
        await storeResetCode(email, code);
        await sendResetCodeEmail(email, code);

        sendJson(res, 200, successResponse);
        return true;
      }

      if (pathname === '/api/auth/reset-verify' && method === 'POST') {
        const body = await readJsonBody(req);
        const email = String(body?.email || '').trim().toLowerCase();
        const code = String(body?.code || '').trim();

        if (!EMAIL_PATTERN.test(email) || !code) {
          sendJson(res, 400, { error: 'Email and code are required' });
          return true;
        }

        const stored = await getResetCode(email);
        if (!stored) {
          sendJson(res, 400, { error: 'No reset code found. It may have expired.' });
          return true;
        }

        if (stored.attempts >= 5) {
          await deleteResetCode(email);
          sendJson(res, 400, { error: 'Too many failed attempts. Please request a new code.' });
          return true;
        }

        if (stored.code !== code) {
          await incrementAttempts(email, stored);
          const remaining = 4 - stored.attempts;
          sendJson(res, 400, { error: `Invalid code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` });
          return true;
        }

        await deleteResetCode(email);
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

        const users = (config.users || []).map((u) =>
          String(u.id) === String(user.id) ? { ...u, password: newPassword } : u
        );
        await writeRbacConfig({ ...config, users });

        sendJson(res, 200, { message: 'Password has been reset successfully.' });
        return true;
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const auth = await requireUser(req, res);
        if (!auth) return true;
        sendJson(res, 200, { user: userView(auth.user) });
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
        const selectedWorkflowIds = getQueryParam(req.url, 'workflowIds');
        const access = {
          allowedWorkflowIds: applyWorkflowSelection(baseAllowedWorkflowIds, selectedWorkflowIds),
        };

        if (pathname === '/api/dashboard/overview' && method === 'GET') {
          sendJson(res, 200, await buildOverview(n8n, access));
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

          const sendOverview = async () => {
            try {
              send('overview', await buildOverview(n8n, access));
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
