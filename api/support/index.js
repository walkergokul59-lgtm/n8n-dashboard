import { createSupportTicket, listSupportTickets } from '../_lib/support.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.method === 'GET') {
      const payload = await listSupportTickets(auth.user, { status: req?.query?.status });
      res.status(200).json(payload);
      return;
    }

    if (req.method === 'POST') {
      const payload = await createSupportTicket(auth.user, req.body || {}, req);
      res.status(201).json(payload);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
