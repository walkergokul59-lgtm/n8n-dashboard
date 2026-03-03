import crypto from 'node:crypto';

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function parsePayload(part) {
  try {
    return JSON.parse(fromBase64Url(part));
  } catch {
    return null;
  }
}

function signPart(part, secret) {
  return crypto.createHmac('sha256', secret).update(part).digest('base64url');
}

export function issueToken(payload, secret, ttlSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = toBase64Url(JSON.stringify(body));
  const signature = signPart(`${header}.${data}`, secret);
  return `${header}.${data}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, data, signature] = parts;
  const expected = signPart(`${header}.${data}`, secret);
  if (expected !== signature) return null;

  const payload = parsePayload(data);
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;
  return payload;
}

export function extractBearerTokenFromHeaders(headers) {
  const authHeader = headers?.authorization || headers?.Authorization || '';
  const [scheme, token] = String(authHeader).split(' ');
  if (String(scheme).toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

