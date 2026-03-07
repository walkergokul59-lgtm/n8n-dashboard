import { loginWithGoogle, signupClientUserWithGoogle } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    const mode = String(req.body?.mode || 'signin').trim().toLowerCase();
    const credential = String(req.body?.credential || '').trim();
    const clientName = String(req.body?.clientName || '').trim();

    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    if (mode === 'signup') {
      const payload = await signupClientUserWithGoogle({ credential, clientName });
      res.status(201).json(payload);
      return;
    }

    if (mode !== 'signin') {
      res.status(400).json({ error: 'Invalid Google auth mode' });
      return;
    }

    const payload = await loginWithGoogle(credential);
    res.status(200).json(payload);
  } catch (error) {
    res.status(Number.isFinite(error?.status) ? error.status : 500).json({
      error: error?.message || String(error),
    });
  }
}
