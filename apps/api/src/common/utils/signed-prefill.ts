import { createHmac, timingSafeEqual } from 'crypto';

type PrefillPayload = { phone: string; name?: string; exp: number };

function secret() {
  return process.env.JWT_SECRET || process.env.GOOGLE_AI_API_KEY || 'catagce-prefill';
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

export function signBuyerPrefill(phone: string, name?: string, ttlSec = 60 * 60 * 24 * 30) {
  const payload: PrefillPayload = {
    phone: phone.replace(/\D/g, ''),
    name: name?.trim() || undefined,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyBuyerPrefill(token: string): PrefillPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PrefillPayload;
    if (!payload?.phone || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function orderRef(orderId: string) {
  return orderId.replace(/-/g, '').slice(0, 8).toLowerCase();
}

export function extractOrderRef(text: string): string | null {
  const m = String(text || '').match(/Ref:\s*#?([a-f0-9]{8})/i)
    || String(text || '').match(/#([a-f0-9]{8})\b/i);
  return m ? m[1].toLowerCase() : null;
}
