import nodemailer from 'nodemailer';

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

export async function sendResetCodeEmail(toEmail, code) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Password Reset] Code for ${toEmail}: ${code}`);
    console.log('[Password Reset] Set GMAIL_USER and GMAIL_APP_PASSWORD to send emails in production.');
    return {
      delivered: false,
      provider: 'console',
      reason: 'Gmail SMTP credentials are not configured.',
    };
  }

  const result = await transport.sendMail({
    from: getFromEmail(),
    to: toEmail,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          You requested a password reset. Use the code below to verify your identity:
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
        </div>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">
          This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return {
    delivered: true,
    provider: 'gmail',
    id: String(result?.messageId || ''),
  };
}

export async function sendSupportTicketCreatedEmail({ toEmail, ticket, ticketUrl }) {
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
