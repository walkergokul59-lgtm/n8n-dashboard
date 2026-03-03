import { getN8nClient } from './_client.js';
import { listWorkflows } from '../../server/dashboardCore.js';

export default async function handler(req, res) {
  try {
    const n8n = getN8nClient();
    const data = await listWorkflows(n8n, 200);
    res.status(200).json(data);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}

