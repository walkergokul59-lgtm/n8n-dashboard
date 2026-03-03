import { getN8nClient } from './_client.js';
import { checkHealth } from '../../server/dashboardCore.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const n8n = getN8nClient();
    const data = await checkHealth(n8n);
    res.status(200).json(data);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
