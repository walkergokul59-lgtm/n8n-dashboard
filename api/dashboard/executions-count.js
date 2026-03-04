import { getN8nClient } from './_client.js';
import { countExecutionsInRange } from '../../server/dashboardCore.js';
import { applyRequestedWorkflowScope, requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
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

    const from = req?.query?.from || null;
    const to = req?.query?.to || null;

    const n8n = getN8nClient();
    const scopedAccess = applyRequestedWorkflowScope(req, auth.access);
    const data = await countExecutionsInRange(n8n, { from, to, access: scopedAccess });
    res.status(200).json(data);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}
