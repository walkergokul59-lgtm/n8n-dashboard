import { isUserApproved } from '../../server/accessControl.js';
import { readRbacConfig } from '../../server/rbacStore.js';
import { readSupportConfig, writeSupportConfig } from '../../server/supportStore.js';
import { sendSupportTicketCreatedEmail } from './email.js';

function getAdminEmails(rbac) {
  return (rbac?.users || [])
    .filter((u) => String(u.role || '') === 'admin' && u.email)
    .map((u) => String(u.email).trim().toLowerCase())
    .filter(Boolean);
}

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createId(prefix) {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1000000).toString(36);
  return `${prefix}_${now}${random}`;
}

function normalizeStatusFilter(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'open' || normalized === 'closed' ? normalized : '';
}

function normalizeSubject(value) {
  return String(value || '').trim().slice(0, 120);
}

function normalizeMessage(value) {
  return String(value || '').trim().slice(0, 4000);
}

function ensureSupportAccess(authUser) {
  if (!authUser) {
    throw createError('Authentication required', 401);
  }
  if (String(authUser.role || '') !== 'admin' && !isUserApproved(authUser)) {
    throw createError('Support chat is available after admin approval.', 403);
  }
}

function compareUpdatedAtDescending(left, right) {
  return String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || ''));
}

function getClientDisplayName(client, user) {
  const onboardingName = String(client?.onboardingProfile?.clientName || '').trim();
  const clientName = String(client?.name || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  return onboardingName || clientName || email || 'Client';
}

function getAppBaseUrl(req) {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const headers = req?.headers || {};
  const forwardedHost = Array.isArray(headers['x-forwarded-host'])
    ? headers['x-forwarded-host'][0]
    : headers['x-forwarded-host'];
  const forwardedProto = Array.isArray(headers['x-forwarded-proto'])
    ? headers['x-forwarded-proto'][0]
    : headers['x-forwarded-proto'];
  const host = String(forwardedHost || headers.host || '').trim();
  const proto = String(forwardedProto || '').trim()
    || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  if (host) return `${proto}://${host}`;
  return `http://localhost:${process.env.PORT || 5173}`;
}

function buildTicketUrl(req, ticketId) {
  return `${getAppBaseUrl(req)}/support/${encodeURIComponent(ticketId)}`;
}

function findTicketIndex(state, ticketId) {
  return (state?.tickets || []).findIndex((ticket) => String(ticket.id) === String(ticketId));
}

function assertTicketAccess(authUser, ticket) {
  if (!ticket) {
    throw createError('Support ticket not found.', 404);
  }

  if (String(authUser.role || '') === 'admin') {
    return ticket;
  }

  const userClientId = String(authUser.clientId || '');
  if (String(ticket.clientId || '') !== userClientId) {
    throw createError('You do not have access to this ticket.', 403);
  }

  return ticket;
}

function updateTicket(state, ticketId, updater) {
  const ticketIndex = findTicketIndex(state, ticketId);
  if (ticketIndex < 0) {
    throw createError('Support ticket not found.', 404);
  }

  const nextTickets = [...(state.tickets || [])];
  nextTickets[ticketIndex] = updater(nextTickets[ticketIndex]);
  return { ...state, tickets: nextTickets };
}

export async function listSupportTickets(authUser, { status } = {}) {
  ensureSupportAccess(authUser);

  const state = await readSupportConfig();
  const normalizedStatus = normalizeStatusFilter(status);
  let tickets = [...(state.tickets || [])];

  if (String(authUser.role || '') !== 'admin') {
    const userClientId = String(authUser.clientId || '');
    tickets = tickets.filter((ticket) => String(ticket.clientId || '') === userClientId);
  }

  if (normalizedStatus) {
    tickets = tickets.filter((ticket) => ticket.status === normalizedStatus);
  }

  tickets.sort(compareUpdatedAtDescending);
  return { tickets };
}

export async function readSupportTicket(authUser, ticketId) {
  ensureSupportAccess(authUser);

  const state = await readSupportConfig();
  const ticket = state.tickets?.find((entry) => String(entry.id) === String(ticketId || ''));
  return { ticket: assertTicketAccess(authUser, ticket) };
}

export async function createSupportTicket(authUser, payload, req) {
  ensureSupportAccess(authUser);
  if (String(authUser.role || '') === 'admin') {
    throw createError('Admin users cannot create support tickets.', 403);
  }

  const subject = normalizeSubject(payload?.subject);
  const message = normalizeMessage(payload?.message);

  if (!subject) {
    throw createError('Subject is required.', 400);
  }
  if (!message) {
    throw createError('Message is required.', 400);
  }

  const [rbac, supportState] = await Promise.all([readRbacConfig(), readSupportConfig()]);
  const user = (rbac.users || []).find((entry) => String(entry.id) === String(authUser.id || '')) || authUser;
  const client = (rbac.clients || []).find((entry) => String(entry.id) === String(user.clientId || ''));
  const clientId = String(user.clientId || '');

  if (!clientId) {
    throw createError('Client account is not linked correctly.', 400);
  }

  const existingOpenTicket = (supportState.tickets || []).find((ticket) => (
    String(ticket.clientId || '') === clientId && ticket.status === 'open'
  ));

  if (existingOpenTicket) {
    throw createError('You already have an open support ticket.', 409);
  }

  const now = new Date().toISOString();
  const ticket = {
    id: createId('tck'),
    clientId,
    clientUserId: String(user.id || authUser.id || ''),
    clientName: getClientDisplayName(client, user),
    clientEmail: String(user.email || '').trim().toLowerCase(),
    subject,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    closedByUserId: null,
    messages: [
      {
        id: createId('msg'),
        authorUserId: String(user.id || authUser.id || ''),
        authorRole: 'client',
        authorLabel: getClientDisplayName(client, user),
        body: message,
        createdAt: now,
      },
    ],
  };

  const saved = await writeSupportConfig({
    ...supportState,
    tickets: [ticket, ...(supportState.tickets || [])],
  });

  const savedTicket = saved.tickets?.find((entry) => String(entry.id) === ticket.id) || ticket;
  const ticketUrl = buildTicketUrl(req, savedTicket.id);
  const adminEmails = getAdminEmails(rbac);

  const notification = {
    attempted: adminEmails.length > 0,
    delivered: false,
    adminCount: adminEmails.length,
    ticketUrl,
    results: [],
  };

  if (adminEmails.length === 0) {
    console.log('[Support Ticket] No admin users found to notify.');
  }

  const emailResults = await Promise.allSettled(
    adminEmails.map((toEmail) =>
      sendSupportTicketCreatedEmail({ toEmail, ticket: savedTicket, ticketUrl })
    )
  );

  let deliveredCount = 0;
  for (let i = 0; i < emailResults.length; i++) {
    const outcome = emailResults[i];
    const toEmail = adminEmails[i];
    if (outcome.status === 'fulfilled' && outcome.value?.delivered) {
      deliveredCount++;
      notification.results.push({ toEmail, delivered: true });
    } else {
      const errorMsg = outcome.status === 'rejected'
        ? (outcome.reason?.message || 'Send failed')
        : (outcome.value?.reason || 'Not delivered');
      notification.results.push({ toEmail, delivered: false, error: errorMsg });
      console.error(`[Support Ticket] Email to ${toEmail} failed:`, errorMsg);
    }
  }

  notification.delivered = deliveredCount > 0;

  return { ticket: savedTicket, notification };
}

export async function addSupportTicketMessage(authUser, ticketId, payload) {
  ensureSupportAccess(authUser);

  const message = normalizeMessage(payload?.message);
  if (!message) {
    throw createError('Message is required.', 400);
  }

  const state = await readSupportConfig();
  const currentTicket = state.tickets?.find((entry) => String(entry.id) === String(ticketId || ''));
  const ticket = assertTicketAccess(authUser, currentTicket);

  if (ticket.status === 'closed') {
    throw createError('This ticket is already closed.', 400);
  }

  const now = new Date().toISOString();
  const authorIsAdmin = String(authUser.role || '') === 'admin';
  const nextState = updateTicket(state, ticketId, (current) => ({
    ...current,
    updatedAt: now,
    messages: [
      ...(current.messages || []),
      {
        id: createId('msg'),
        authorUserId: String(authUser.id || ''),
        authorRole: authorIsAdmin ? 'admin' : 'client',
        authorLabel: authorIsAdmin
          ? String(authUser.email || 'Admin').trim()
          : String(current.clientName || authUser.email || 'Client').trim(),
        body: message,
        createdAt: now,
      },
    ],
  }));

  const saved = await writeSupportConfig(nextState);
  const savedTicket = saved.tickets?.find((entry) => String(entry.id) === String(ticketId));
  return { ticket: assertTicketAccess(authUser, savedTicket) };
}

export async function closeSupportTicket(authUser, ticketId) {
  ensureSupportAccess(authUser);
  if (String(authUser.role || '') !== 'admin') {
    throw createError('Only admin can close support tickets.', 403);
  }

  const state = await readSupportConfig();
  const currentTicket = state.tickets?.find((entry) => String(entry.id) === String(ticketId || ''));
  assertTicketAccess(authUser, currentTicket);

  if (currentTicket.status === 'closed') {
    return { ticket: currentTicket };
  }

  const now = new Date().toISOString();
  const nextState = updateTicket(state, ticketId, (current) => ({
    ...current,
    status: 'closed',
    updatedAt: now,
    closedAt: now,
    closedByUserId: String(authUser.id || ''),
  }));

  const saved = await writeSupportConfig(nextState);
  const savedTicket = saved.tickets?.find((entry) => String(entry.id) === String(ticketId));
  return { ticket: assertTicketAccess(authUser, savedTicket) };
}
