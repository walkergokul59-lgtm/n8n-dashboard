import { readClientSettings, requireUser, writeClientSettings } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.method === 'GET') {
      const payload = await readClientSettings(auth.user);
      if (!payload) {
        res.status(404).json({ error: 'Client settings not found' });
        return;
      }
      res.status(200).json(payload);
      return;
    }

    if (req.method === 'PUT') {
      const payload = await writeClientSettings(auth.user, req.body || {});
      if (!payload) {
        res.status(404).json({ error: 'Client settings not found' });
        return;
      }
      res.status(200).json(payload);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
