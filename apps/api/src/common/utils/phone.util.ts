export function digitsOnly(raw: string) {
  return String(raw || '').replace(/\D/g, '');
}

export function normalizePhoneDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (!d) return '';
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith('1')) return d;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('1') && d.length >= 11) return d;
  return d;
}

export function isValidPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  return d.length >= 11 && d.length <= 15;
}

export function maskPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  if (d.length < 8) return '***';
  return `***${d.slice(-4)}`;
}

export function waEmailFromPhone(phone: string) {
  return `${normalizePhoneDigits(phone)}@wa.catagce.local`;
}
