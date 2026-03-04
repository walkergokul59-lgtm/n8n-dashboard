import { signupClientUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = await signupClientUser({
      email: req?.body?.email,
      password: req?.body?.password,
      clientName: req?.body?.clientName,
    });
    res.status(201).json(payload);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
