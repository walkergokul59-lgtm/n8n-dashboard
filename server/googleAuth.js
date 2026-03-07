import crypto from 'node:crypto';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let cachedCerts = null;
let certsExpireAt = 0;

function createError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function base64UrlToBuffer(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=');
  return Buffer.from(padded, 'base64');
}

function parseJwtSection(token, index) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw createError('Invalid Google credential', 400);
  }

  try {
    return JSON.parse(base64UrlToBuffer(parts[index]).toString('utf8'));
  } catch {
    throw createError('Invalid Google credential payload', 400);
  }
}

function getAllowedGoogleAudiences() {
  const values = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_IDS,
    process.env.VITE_GOOGLE_CLIENT_ID,
  ]
    .flatMap((part) => String(part || '').split(','))
    .map((part) => part.trim())
    .filter(Boolean);

  return new Set(values);
}

function parseMaxAgeSeconds(cacheControl) {
  const match = String(cacheControl || '').match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

async function fetchGoogleCerts({ force = false } = {}) {
  if (!force && cachedCerts && Date.now() < certsExpireAt) {
    return cachedCerts;
  }

  const response = await fetch(GOOGLE_CERTS_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw createError('Failed to verify Google credential', 502);
  }

  const payload = await response.json();
  const maxAgeSeconds = parseMaxAgeSeconds(response.headers.get('cache-control'));
  cachedCerts = payload && typeof payload === 'object' ? payload : {};
  certsExpireAt = Date.now() + (Math.max(60, maxAgeSeconds) * 1000);
  return cachedCerts;
}

function verifyJwtSignature(idToken, certificate) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(idToken || '').split('.');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  return verifier.verify(certificate, base64UrlToBuffer(encodedSignature));
}

function normalizeVerifiedGoogleProfile(claims) {
  return {
    sub: String(claims?.sub || '').trim(),
    email: String(claims?.email || '').trim().toLowerCase(),
    name: String(claims?.name || '').trim(),
    picture: String(claims?.picture || '').trim(),
  };
}

export async function verifyGoogleIdToken(idToken) {
  const token = String(idToken || '').trim();
  if (!token) {
    throw createError('Google credential is required', 400);
  }

  const audiences = getAllowedGoogleAudiences();
  if (audiences.size === 0) {
    throw createError('Google authentication is not configured on the server', 500);
  }

  const header = parseJwtSection(token, 0);
  const claims = parseJwtSection(token, 1);
  if (String(header?.alg || '') !== 'RS256') {
    throw createError('Unsupported Google credential algorithm', 400);
  }

  const issuer = String(claims?.iss || '').trim();
  if (!GOOGLE_ISSUERS.has(issuer)) {
    throw createError('Invalid Google token issuer', 401);
  }

  const audienceValues = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  const hasAllowedAudience = audienceValues.some((value) => audiences.has(String(value || '').trim()));
  if (!hasAllowedAudience) {
    throw createError('Invalid Google token audience', 401);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const exp = Number(claims?.exp || 0);
  const iat = Number(claims?.iat || 0);
  const nbf = Number(claims?.nbf || 0);
  if (!exp || nowInSeconds >= exp) {
    throw createError('Google credential has expired', 401);
  }
  if (iat && iat > nowInSeconds + 300) {
    throw createError('Google credential is not yet valid', 401);
  }
  if (nbf && nowInSeconds < nbf - 300) {
    throw createError('Google credential is not yet valid', 401);
  }

  const emailVerified = claims?.email_verified === true || claims?.email_verified === 'true';
  if (!emailVerified) {
    throw createError('Google account email is not verified', 401);
  }

  const profile = normalizeVerifiedGoogleProfile(claims);
  if (!profile.sub || !profile.email) {
    throw createError('Google account details are incomplete', 400);
  }

  let certificates = await fetchGoogleCerts();
  let certificate = certificates[String(header?.kid || '').trim()] || '';
  if (!certificate) {
    certificates = await fetchGoogleCerts({ force: true });
    certificate = certificates[String(header?.kid || '').trim()] || '';
  }
  if (!certificate) {
    throw createError('Unable to verify Google credential signature', 401);
  }

  if (!verifyJwtSignature(token, certificate)) {
    throw createError('Invalid Google credential signature', 401);
  }

  return profile;
}
