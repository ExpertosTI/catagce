import { normalizePhoneDigits } from './phone.util';

/** Teléfono de alertas del negocio — solo `companies.phone` (Ajustes). */
export function resolveCompanyNotifyPhone(companyPhone: string | null | undefined) {
  const raw = String(companyPhone || '').trim();
  if (!raw) return '';
  return normalizePhoneDigits(raw);
}
