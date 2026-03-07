import {
  applyWorkflowSelection,
  authenticateUser,
  findUserByEmail,
  findUserById,
  getAllowedWorkflowIds,
  isUserApproved,
  normalizeApprovalStatus,
} from '../../server/accessControl.js';
import { verifyGoogleIdToken } from '../../server/googleAuth.js';
import { readRbacConfig, sanitizeRbacConfigForAdmin, writeRbacConfig } from '../../server/rbacStore.js';
import { extractBearerTokenFromHeaders, issueToken, verifyToken } from '../../server/tokenAuth.js';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authSecret() {
  return process.env.APP_AUTH_SECRET || 'change-this-secret';
}

function createError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
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

function normalizeAuthProviders(input) {
  const values = Array.isArray(input) ? input : [];
  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

function issueUserSession(user) {
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

  return issueUserSession(user);
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

  return issueUserSession(createdUser);
}

function findUserByGoogleSub(config, googleSub) {
  const target = String(googleSub || '').trim();
  if (!target) return null;
  return (config?.users || []).find((user) => String(user.googleSub || '').trim() === target) || null;
}

function applyGoogleProfileToUser(user, googleProfile) {
  return {
    ...user,
    email: googleProfile.email || user.email,
    googleSub: googleProfile.sub,
    authProviders: normalizeAuthProviders([...(user.authProviders || []), 'google']),
  };
}

async function persistGoogleLink(config, user, googleProfile) {
  const users = [...(config.users || [])];
  const userIndex = users.findIndex((entry) => String(entry.id) === String(user.id));
  if (userIndex < 0) {
    throw createError('User account not found', 404);
  }

  const nextUser = applyGoogleProfileToUser(users[userIndex], googleProfile);
  users[userIndex] = nextUser;
  const saved = await writeRbacConfig({ ...config, users });
  const savedUser = findUserById(saved, nextUser.id);
  if (!savedUser) {
    throw createError('Failed to link Google account', 500);
  }
  return savedUser;
}

function buildGoogleSignupProfile(googleProfile, clientName) {
  return {
    ...emptyOnboardingProfile(),
    clientName: clientName || googleProfile.name || '',
    primaryEmail: googleProfile.email,
    profileImage: googleProfile.picture || '',
  };
}

export async function loginWithGoogle(credential) {
  const googleProfile = await verifyGoogleIdToken(credential);
  const config = await readRbacConfig();
  const userByGoogleSub = findUserByGoogleSub(config, googleProfile.sub);
  const userByEmail = findUserByEmail(config, googleProfile.email);

  if (userByGoogleSub && userByEmail && String(userByGoogleSub.id) !== String(userByEmail.id)) {
    throw createError('This Google account is already linked to another user', 409);
  }

  let resolvedUser = userByGoogleSub || userByEmail;
  if (!resolvedUser) {
    throw createError('No account found for this Google account. Use Sign Up with Google first.', 404);
  }

  if (resolvedUser.googleSub && String(resolvedUser.googleSub) !== googleProfile.sub) {
    throw createError('This email is already linked to a different Google account', 409);
  }

  const shouldPersistLink = String(resolvedUser.googleSub || '') !== googleProfile.sub
    || String(resolvedUser.email || '').trim().toLowerCase() !== googleProfile.email
    || !normalizeAuthProviders(resolvedUser.authProviders).includes('google');

  if (shouldPersistLink) {
    resolvedUser = await persistGoogleLink(config, resolvedUser, googleProfile);
  }

  return issueUserSession(resolvedUser);
}

export async function signupClientUserWithGoogle({ credential, clientName }) {
  const googleProfile = await verifyGoogleIdToken(credential);
  const normalizedClientName = String(clientName || '').trim();
  const config = await readRbacConfig();
  const existingUser = findUserByGoogleSub(config, googleProfile.sub) || findUserByEmail(config, googleProfile.email);
  if (existingUser) {
    throw createError('Email is already registered. Use Sign In with Google instead.', 409);
  }

  const localPart = googleProfile.email.split('@')[0] || '';
  const nextClientName = normalizedClientName || googleProfile.name || localPart || 'New Client';
  const existingClientIds = new Set((config.clients || []).map((client) => String(client.id)));
  const nextClient = {
    id: nextClientId(nextClientName || localPart, existingClientIds),
    name: nextClientName,
    workflowIds: [],
    onboardingProfile: buildGoogleSignupProfile(googleProfile, nextClientName),
    onboardingSubmittedAt: null,
  };
  const nextUser = {
    id: createId('user'),
    email: googleProfile.email,
    role: 'client',
    clientId: nextClient.id,
    approvalStatus: 'pending',
    googleSub: googleProfile.sub,
    authProviders: ['google'],
  };

  const saved = await writeRbacConfig({
    users: [...(config.users || []), nextUser],
    clients: [...(config.clients || []), nextClient],
  });

  const createdUser = findUserById(saved, nextUser.id);
  if (!createdUser) {
    throw createError('Failed to create signup account', 500);
  }

  return issueUserSession(createdUser);
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
