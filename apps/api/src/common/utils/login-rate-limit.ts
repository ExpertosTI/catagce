type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/** Límite simple en memoria por IP+identificador (reinicia al reiniciar el proceso). */
export function assertLoginAllowed(key: string, maxAttempts = 10, windowMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  if (entry.count > maxAttempts) {
    throw new Error('RATE_LIMIT');
  }
}

export function resetLoginAttempts(key: string): void {
  buckets.delete(key);
}
