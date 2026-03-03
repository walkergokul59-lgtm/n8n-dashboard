import { authenticateUser, findUserById, getAllowedWorkflowIds } from '../../server/accessControl.js';
import { readRbacConfig, sanitizeRbacConfigForAdmin, writeRbacConfig } from '../../server/rbacStore.js';
import { extractBearerTokenFromHeaders, issueToken, verifyToken } from '../../server/tokenAuth.js';

function authSecret() {
  return process.env.APP_AUTH_SECRET || 'change-this-secret';
}

function tokenFromReq(req) {
  const headerToken = extractBearerTokenFromHeaders(req.headers || {});
  if (headerToken) return headerToken;
  return req?.query?.token || null;
}

export function userView(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };
}

export async function loginWithPassword(email, password) {
  const config = await readRbacConfig();
  const user = authenticateUser(config, email, password);
  if (!user) return null;

  const token = issueToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      clientId: user.clientId,
    },
    authSecret(),
    60 * 60 * 24
  );

  return { token, user: userView(user) };
}

export async function requireUser(req) {
  const token = tokenFromReq(req);
  const payload = verifyToken(token, authSecret());
  if (!payload?.sub) return null;

  const config = await readRbacConfig();
  const user = findUserById(config, payload.sub);
  if (!user) return null;

  return { user, config, access: { allowedWorkflowIds: getAllowedWorkflowIds(config, user) } };
}

export async function readAdminRbac() {
  const config = await readRbacConfig();
  return sanitizeRbacConfigForAdmin(config);
}

export async function writeAdminRbac(next) {
  const saved = await writeRbacConfig(next);
  return sanitizeRbacConfigForAdmin(saved);
}

