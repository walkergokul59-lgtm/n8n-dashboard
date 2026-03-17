import nodemailer from 'nodemailer';
import { callN8nWebhook } from './n8n-webhook.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

function getFromEmail() {
  return process.env.GMAIL_USER?.trim() || 'noreply@example.com';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summarizeText(value, maxLength = 280) {
  const normalized = String(value || '').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}...`;
}

/**
 * Send a password reset email via n8n only.
 * n8n generates and sends the OTP email.
 * Throws if N8N_WEBHOOK_BASE_URL is not configured.
 */
export async function sendResetCodeEmail(toEmail, code, user) {
  const webhookBase = process.env.N8N_WEBHOOK_BASE_URL?.trim();

  if (!webhookBase) {
    throw new Error(
      'N8N_WEBHOOK_BASE_URL is not configured. Password resets require n8n webhook integration.'
    );
  }

  const name = user?.clientId || toEmail.split('@')[0];
  const result = await callN8nWebhook('/reset_password', { name, email: toEmail, otp: code });
  if (result.ok) {
    return { delivered: true, provider: 'n8n' };
  }

  const errorMsg = result.error || `HTTP ${result.status}`;
  console.error(`[Password Reset] n8n webhook failed: ${errorMsg}`);
  console.error(`[Password Reset] Response:`, result.data);
  throw new Error(`n8n password reset webhook failed: ${errorMsg}`);
}

/**
 * Send a support ticket notification email to an admin.
 * When N8N_WEBHOOK_BASE_URL is set, delegates to n8n support ticket webhook.
 * Falls back to Nodemailer (or console log) if n8n is not configured.
 */
export async function sendSupportTicketCreatedEmail({ toEmail, ticket, ticketUrl }) {
  const webhookBase = process.env.N8N_WEBHOOK_BASE_URL?.trim();

  if (webhookBase) {
    const webhookPath = process.env.N8N_SUPPORT_WEBHOOK_PATH?.trim() || '/webhook/support_ticket';
    const result = await callN8nWebhook(webhookPath, {
      toEmail,
      ticketId: ticket?.id || '',
      subject: ticket?.subject || 'Support request',
      clientName: ticket?.clientName || '',
      clientEmail: ticket?.clientEmail || '',
      message: ticket?.messages?.[0]?.body || '',
      ticketUrl: String(ticketUrl || ''),
    });
    if (result.ok) {
      return { delivered: true, provider: 'n8n' };
    }
    console.error(`[Support Ticket] n8n webhook failed (${result.status}): ${result.error || JSON.stringify(result.data)}`);
    return { delivered: false, provider: 'n8n', reason: result.error || `HTTP ${result.status}` };
  }

  // Nodemailer fallback
  const transport = getTransporter();
  const safeTicketUrl = String(ticketUrl || '').trim();
  const subject = escapeHtml(ticket?.subject || 'Support request');
  const clientName = escapeHtml(ticket?.clientName || 'Client');
  const clientEmail = escapeHtml(ticket?.clientEmail || '');
  const ticketId = escapeHtml(ticket?.id || '');
  const messagePreview = escapeHtml(summarizeText(ticket?.messages?.[0]?.body || '', 600));

  if (!transport) {
    console.log(`[Support Ticket] New ticket ${ticket?.id || ''} from ${ticket?.clientEmail || ''}`);
    console.log(`[Support Ticket] Open: ${safeTicketUrl}`);
    console.log('[Support Ticket] Set GMAIL_USER and GMAIL_APP_PASSWORD to send emails in production.');
    return {
      delivered: false,
      provider: 'console',
      reason: 'Gmail SMTP credentials are not configured.',
    };
  }

  const result = await transport.sendMail({
    from: getFromEmail(),
    to: toEmail,
    subject: `New Support Ticket ${ticket?.id || ''} from ${ticket?.clientName || ticket?.clientEmail || 'Client'}`,
    text: [
      'New Support Ticket',
      '',
      `Ticket ID: ${ticket?.id || ''}`,
      `Client: ${ticket?.clientName || 'Client'}`,
      `Email: ${ticket?.clientEmail || ''}`,
      `Subject: ${ticket?.subject || 'Support request'}`,
      '',
      `Initial Message: ${ticket?.messages?.[0]?.body || ''}`,
      '',
      `Open Ticket: ${safeTicketUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">New Support Ticket</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          A client created a new support ticket in the dashboard.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 18px; margin: 24px 0; color: #111;">
          <p style="margin: 0 0 8px;"><strong>Ticket ID:</strong> ${ticketId}</p>
          <p style="margin: 0 0 8px;"><strong>Client:</strong> ${clientName}</p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${clientEmail}</p>
          <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin: 0;"><strong>Initial Message:</strong><br />${messagePreview}</p>
        </div>
        <a
          href="${escapeHtml(safeTicketUrl)}"
          style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 600;"
        >
          Open Ticket
        </a>
      </div>
    `,
  });

  return {
    delivered: true,
    provider: 'gmail',
    id: String(result?.messageId || ''),
  };
}
