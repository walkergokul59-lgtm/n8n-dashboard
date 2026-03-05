import { getResetCode, incrementAttempts, deleteResetCode, issueResetToken } from '../_lib/resetCodes.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const email = String(req?.body?.email || '').trim().toLowerCase();
    const code = String(req?.body?.code || '').trim();

    if (!EMAIL_PATTERN.test(email) || !code) {
      res.status(400).json({ error: 'Email and code are required' });
      return;
    }

    const stored = await getResetCode(email);
    if (!stored) {
      res.status(400).json({ error: 'No reset code found. It may have expired.' });
      return;
    }

    // Max 5 attempts
    if (stored.attempts >= 5) {
      await deleteResetCode(email);
      res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
      return;
    }

    if (stored.code !== code) {
      await incrementAttempts(email, stored);
      const remaining = 4 - stored.attempts;
      res.status(400).json({ error: `Invalid code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` });
      return;
    }

    // Code matches — delete it and issue a reset token
    await deleteResetCode(email);
    const resetToken = issueResetToken(email);

    res.status(200).json({ resetToken });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}
