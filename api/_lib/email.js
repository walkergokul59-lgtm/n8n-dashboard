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

export async function sendResetCodeEmail(toEmail, code) {
  const client = await getResendClient();

  if (!client) {
    console.log(`[Password Reset] Code for ${toEmail}: ${code}`);
    console.log('[Password Reset] Set RESEND_API_KEY to send emails in production.');
    return;
  }

  await client.emails.send({
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
}
