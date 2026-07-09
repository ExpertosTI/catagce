/** DR / US phone helpers for WhatsApp. */

export function digitsOnly(raw: string) {
  return String(raw || '').replace(/\D/g, '');
}

export function normalizePhoneDigits(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return '';
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith('1')) return d;
  if (d.startsWith('00') && d.length > 10) return d.slice(2);
  return d;
}

export function isValidPhone(raw: string) {
  return normalizePhoneDigits(raw).length >= 11;
}

export function maskPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  if (d.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}
