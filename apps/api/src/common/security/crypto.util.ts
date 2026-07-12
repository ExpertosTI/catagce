import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

const ENC_PREFIX = 'enc:v1:';

function encryptionKey(): Buffer | null {
  const raw = String(process.env.ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return scryptSync(raw, 'catagce-enc-v1', 32);
}

/** AES-256-GCM. Sin ENCRYPTION_KEY en prod se recomienda fallar al guardar; en lectura plaintext legacy OK. */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  if (String(plain).startsWith(ENC_PREFIX)) return String(plain);
  const key = encryptionKey();
  if (!key) return String(plain);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null;
  const s = String(stored);
  if (!s.startsWith(ENC_PREFIX)) return s;
  const key = encryptionKey();
  if (!key) throw new Error('ENCRYPTION_KEY requerido para descifrar secretos');
  const parts = s.slice(ENC_PREFIX.length).split('.');
  if (parts.length !== 3) throw new Error('Secreto cifrado inválido');
  const [ivB, tagB, dataB] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Lectura segura: plaintext legacy OK; enc:v1 sin clave/corrupto → null (nunca devolver ciphertext).
 */
export function resolveStoredSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null;
  const s = String(stored);
  if (!s.startsWith(ENC_PREFIX)) return s;
  try {
    return decryptSecret(s);
  } catch {
    return null;
  }
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(String(apiKey)).digest('hex');
}

export function apiKeyPrefix(apiKey: string): string {
  const k = String(apiKey);
  return k.length <= 12 ? k : `${k.slice(0, 8)}…${k.slice(-4)}`;
}

/** Meta Cloud webhook: X-Hub-Signature-256 */
export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(provided)) return false;
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody;
  const digest = createHmac('sha256', appSecret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}
