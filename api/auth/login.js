import { loginWithPassword } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const email = req?.body?.email;
    const password = req?.body?.password;
    const session = await loginWithPassword(email, password);
    if (!session) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    res.status(200).json(session);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}

