let resendClient = null;

async function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const { Resend } = await import('resend');
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch {
    return null;
  }
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@example.com';
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

function normalizeEmailError(error, fallbackMessage) {
  const message = error?.message || error?.name || fallbackMessage;
  return new Error(String(message || fallbackMessage));
}

export async function sendResetCodeEmail(toEmail, code) {
  const client = await getResendClient();

  if (!client) {
    console.log(`[Password Reset] Code for ${toEmail}: ${code}`);
    console.log('[Password Reset] Set RESEND_API_KEY to send emails in production.');
    return {
      delivered: false,
      provider: 'console',
      reason: 'RESEND_API_KEY is missing or the Resend client could not be loaded.',
    };
  }

  const result = await client.emails.send({
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

  if (result?.error) {
    throw normalizeEmailError(result.error, 'Failed to send password reset email.');
  }

  return {
    delivered: true,
    provider: 'resend',
    id: String(result?.data?.id || ''),
  };
}

export async function sendSupportTicketCreatedEmail({ toEmail, ticket, ticketUrl }) {
  const client = await getResendClient();
  const safeTicketUrl = String(ticketUrl || '').trim();
  const subject = escapeHtml(ticket?.subject || 'Support request');
  const clientName = escapeHtml(ticket?.clientName || 'Client');
  const clientEmail = escapeHtml(ticket?.clientEmail || '');
  const ticketId = escapeHtml(ticket?.id || '');
  const messagePreview = escapeHtml(summarizeText(ticket?.messages?.[0]?.body || '', 600));

  if (!client) {
    console.log(`[Support Ticket] New ticket ${ticket?.id || ''} from ${ticket?.clientEmail || ''}`);
    console.log(`[Support Ticket] Open: ${safeTicketUrl}`);
    console.log('[Support Ticket] Set RESEND_API_KEY to send emails in production.');
    return {
      delivered: false,
      provider: 'console',
      reason: 'RESEND_API_KEY is missing or the Resend client could not be loaded.',
    };
  }

  const result = await client.emails.send({
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

  if (result?.error) {
    throw normalizeEmailError(result.error, 'Failed to send support ticket notification email.');
  }

  return {
    delivered: true,
    provider: 'resend',
    id: String(result?.data?.id || ''),
  };
}
