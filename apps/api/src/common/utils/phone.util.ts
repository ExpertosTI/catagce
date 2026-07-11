/** Prefijos de área de República Dominicana (NANP +1) */
export const DR_AREA_CODES = ['809', '829', '849'] as const;

export function digitsOnly(raw: string) {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Normaliza a dígitos con código país.
 * RD: 10 dígitos (809/829/849…) → 1 + local.
 */
export function normalizePhoneDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith('1')) return d;
  if (d.startsWith('1') && d.length >= 11) return d.slice(0, 15);
  return d;
}

/** Local 10 dígitos si es NANP (+1), si no null */
export function localTenDigits(raw: string): string | null {
  const d = normalizePhoneDigits(raw);
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  if (digitsOnly(raw).length === 10) return digitsOnly(raw);
  return null;
}

export function isDominicanAreaCode(raw: string): boolean {
  const local = localTenDigits(raw);
  if (!local) return false;
  return (DR_AREA_CODES as readonly string[]).includes(local.slice(0, 3));
}

export function isValidPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  if (d.length < 11 || d.length > 15) return false;
  // Números locales RD / NANP: exigir prefijo 809, 829 o 849
  if (d.length === 11 && d.startsWith('1')) {
    return isDominicanAreaCode(d);
  }
  return true;
}

export function phoneValidationMessage(raw: string): string | null {
  const digits = digitsOnly(raw);
  if (!digits) return 'Ingresa tu número de WhatsApp';
  const d = normalizePhoneDigits(raw);
  if (d.length === 11 && d.startsWith('1') && !isDominicanAreaCode(d)) {
    return 'En República Dominicana usa 809, 829 o 849 (10 dígitos), ej: 8295551234';
  }
  if (!isValidPhone(raw)) {
    return 'Número inválido. RD: 809, 829 o 849 — ej: 8095551234';
  }
  return null;
}

export function maskPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  if (d.length < 8) return '***';
  return `***${d.slice(-4)}`;
}

/** Formatos a probar con Evolution API — con país y local (DR) */
export function phoneSendVariants(raw: string): string[] {
  const norm = normalizePhoneDigits(raw);
  if (!norm) return [];
  const local = norm.length === 11 && norm.startsWith('1') ? norm.slice(1) : norm;
  // País primero (más fiable en Evolution), luego local 10 dígitos
  return [...new Set([norm, local].filter(Boolean))];
}

export function waEmailFromPhone(phone: string) {
  return `${normalizePhoneDigits(phone)}@wa.catagce.local`;
}
