import { getN8nClient } from './_client.js';
import { buildOverview } from '../../server/dashboardCore.js';

export default async function handler(req, res) {
  try {
    const n8n = getN8nClient();
    const data = await buildOverview(n8n);
    res.status(200).json(data);
  } catch (err) {
    res.status(Number.isFinite(err?.status) ? err.status : 500).json({ error: err?.message || String(err) });
  }
}

