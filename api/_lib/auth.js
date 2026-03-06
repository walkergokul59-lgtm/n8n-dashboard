import {
  applyWorkflowSelection,
  authenticateUser,
  findUserByEmail,
  findUserById,
  getAllowedWorkflowIds,
  isUserApproved,
  normalizeApprovalStatus,
} from '../../server/accessControl.js';
import { readRbacConfig, sanitizeRbacConfigForAdmin, writeRbacConfig } from '../../server/rbacStore.js';
import { extractBearerTokenFromHeaders, issueToken, verifyToken } from '../../server/tokenAuth.js';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    approvalStatus: normalizeApprovalStatus(user.approvalStatus, 'approved'),
  };
}

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

export async function signupClientUser({ email, password, clientName }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const normalizedClientName = String(clientName || '').trim();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    const error = new Error('Enter a valid email address');
    error.status = 400;
    throw error;
  }
  if (normalizedPassword.length < 4) {
    const error = new Error('Password must be at least 4 characters long');
    error.status = 400;
    throw error;
  }

  const config = await readRbacConfig();
  if (findUserByEmail(config, normalizedEmail)) {
    const error = new Error('Email is already registered');
    error.status = 409;
    throw error;
  }

  const localPart = normalizedEmail.split('@')[0] || '';
  const existingClientIds = new Set((config.clients || []).map((client) => String(client.id)));
  const nextClient = {
    id: nextClientId(normalizedClientName || localPart, existingClientIds),
    name: normalizedClientName || localPart || 'New Client',
    workflowIds: [],
    onboardingProfile: emptyOnboardingProfile(),
    onboardingSubmittedAt: null,
  };
  const nextUser = {
    id: createId('user'),
    email: normalizedEmail,
    password: normalizedPassword,
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
    const error = new Error('Failed to create signup account');
    error.status = 500;
    throw error;
  }

  const token = issueToken(
    {
      sub: createdUser.id,
      role: createdUser.role,
      email: createdUser.email,
      clientId: createdUser.clientId,
    },
    authSecret(),
    60 * 60 * 24
  );

  return { token, user: userView(createdUser) };
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

export function requireApprovedUser(auth) {
  if (!auth?.user) return false;
  return isUserApproved(auth.user);
}

export function applyRequestedWorkflowScope(req, access) {
  const selectedWorkflowIds = req?.query?.workflowIds || null;
  return {
    allowedWorkflowIds: applyWorkflowSelection(access?.allowedWorkflowIds ?? null, selectedWorkflowIds),
  };
}

export async function readAdminRbac() {
  const config = await readRbacConfig();
  return sanitizeRbacConfigForAdmin(config);
}

export async function writeAdminRbac(next) {
  const saved = await writeRbacConfig(next);
  return sanitizeRbacConfigForAdmin(saved);
}

export async function readClientSettings(authUser) {
  if (!authUser) return null;
  if (authUser.role === 'admin') {
    const error = new Error('Admin users do not have client onboarding settings');
    error.status = 403;
    throw error;
  }

  const config = await readRbacConfig();
  const user = findUserById(config, authUser.id);
  if (!user) return null;
  const client = (config.clients || []).find((entry) => String(entry.id) === String(user.clientId || ''));

  return {
    clientId: user.clientId || '',
    approvalStatus: normalizeApprovalStatus(user.approvalStatus, 'pending'),
    profile: normalizeOnboardingProfile(client?.onboardingProfile),
  };
}

export async function writeClientSettings(authUser, nextProfile) {
  if (!authUser) return null;
  if (authUser.role === 'admin') {
    const error = new Error('Admin users do not have client onboarding settings');
    error.status = 403;
    throw error;
  }

  const config = await readRbacConfig();
  const users = [...(config.users || [])];
  const clients = [...(config.clients || [])];
  const profile = normalizeOnboardingProfile(nextProfile || {});
  const primaryEmail = String(profile.primaryEmail || '').trim().toLowerCase();
  const secondaryEmail = String(profile.secondaryEmail || '').trim().toLowerCase();
  const contactCountryCode = String(profile.contactCountryCode || '').trim();
  const contactNumber = String(profile.contactNumber || '').trim();
  if (!/^\+\d{1,4}$/.test(contactCountryCode)) {
    const error = new Error('Country code is required in +<digits> format.');
    error.status = 400;
    throw error;
  }
  if (!/^\d{10}$/.test(contactNumber)) {
    const error = new Error('Contact number must be exactly 10 digits.');
    error.status = 400;
    throw error;
  }
  if (primaryEmail && secondaryEmail && primaryEmail === secondaryEmail) {
    const error = new Error('Primary and secondary emails must be different.');
    error.status = 400;
    throw error;
  }

  const userIndex = users.findIndex((user) => String(user.id) === String(authUser.id));
  if (userIndex < 0) return null;
  users[userIndex] = {
    ...users[userIndex],
    approvalStatus: normalizeApprovalStatus(users[userIndex].approvalStatus, 'pending'),
  };

  const clientId = users[userIndex].clientId || createId('client');
  users[userIndex] = { ...users[userIndex], clientId };

  const clientIndex = clients.findIndex((client) => String(client.id) === String(clientId));
  const nextClientData = {
    id: clientId,
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

  const saved = await writeRbacConfig({ users, clients });
  const savedUser = findUserById(saved, authUser.id);
  const savedClient = (saved.clients || []).find((client) => String(client.id) === String(savedUser?.clientId || ''));
  if (!savedUser) return null;

  return {
    user: userView(savedUser),
    clientId: savedUser.clientId || '',
    approvalStatus: normalizeApprovalStatus(savedUser.approvalStatus, 'pending'),
    profile: normalizeOnboardingProfile(savedClient?.onboardingProfile),
  };
}
