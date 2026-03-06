import { requireUser } from '../../_lib/auth.js';
import { addSupportTicketMessage } from '../../_lib/support.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ticketId = Array.isArray(req?.query?.ticketId) ? req.query.ticketId[0] : req?.query?.ticketId;
    const payload = await addSupportTicketMessage(auth.user, ticketId, req.body || {});
    res.status(200).json(payload);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
