/**
 * Utility for calling n8n webhooks.
 * Reads N8N_WEBHOOK_BASE_URL from environment.
 * Returns { ok, status, data, error } — never throws.
 */
export async function callN8nWebhook(path, payload) {
  let base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/+$/, '');
  if (base && base.endsWith('/reset_password')) {
    base = base.replace(/\/reset_password$/, '');
  }
  if (!base) {
    return { ok: false, status: 0, data: null, error: 'N8N_WEBHOOK_BASE_URL is not configured' };
  }

  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { raw: text } : null;
    }

    return { ok: response.ok, status: response.status, data, error: null };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}
