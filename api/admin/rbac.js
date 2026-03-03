import { readAdminRbac, requireUser, writeAdminRbac } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (auth.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin role required' });
      return;
    }

    if (req.method === 'GET') {
      res.status(200).json(await readAdminRbac());
      return;
    }

    if (req.method === 'PUT') {
      res.status(200).json(await writeAdminRbac(req.body || {}));
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}

