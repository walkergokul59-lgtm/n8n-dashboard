import { issueResetToken } from '../_lib/resetCodes.js';
import { callN8nWebhook } from '../_lib/n8n-webhook.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const email = String(req?.body?.email || '').trim().toLowerCase();
    const otp = String(req?.body?.code || req?.body?.otp || '').trim();

    if (!EMAIL_PATTERN.test(email) || !otp) {
      res.status(400).json({ error: 'Email and OTP are required' });
      return;
    }

    const result = await callN8nWebhook('/OTP_Verify', { email, otp });

    if (!result.ok) {
      const message = result.data?.message || 'Invalid or expired code';
      res.status(400).json({ error: message });
      return;
    }

    // n8n may return { success: false } even with HTTP 200
    if (result.data && result.data.success === false) {
      const message = result.data?.message || 'Invalid or expired code';
      res.status(400).json({ error: message });
      return;
    }

    const resetToken = issueResetToken(email);
    res.status(200).json({ resetToken });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}
