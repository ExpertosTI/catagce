/** Persist media as JSON array in media_url text column (backward compatible). */
export function serializeMediaUrls(urls: string[]): string | null {
  const clean = urls.map((u) => String(u || '').trim()).filter(Boolean);
  if (!clean.length) return null;
  return JSON.stringify(clean);
}

export function parseMediaUrls(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  const value = raw.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through
    }
  }
  return [value];
}
