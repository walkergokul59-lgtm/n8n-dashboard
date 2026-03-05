import { findUserForReset, generateResetCode, getResetCode, storeResetCode } from '../_lib/resetCodes.js';
import { sendResetCodeEmail } from '../_lib/email.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const email = String(req?.body?.email || '').trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }

    // Always return 200 to prevent email enumeration
    const successResponse = { message: 'If an account with that email exists, a reset code has been sent.' };

    const user = await findUserForReset(email);
    if (!user) {
      res.status(200).json(successResponse);
      return;
    }

    // Rate limit: skip if code was created less than 60s ago
    const existing = await getResetCode(email);
    if (existing && Date.now() - existing.createdAt < 60_000) {
      res.status(200).json(successResponse);
      return;
    }

    const code = generateResetCode();
    await storeResetCode(email, code);
    await sendResetCodeEmail(email, code);

    res.status(200).json(successResponse);
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}
