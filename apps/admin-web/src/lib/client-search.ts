/** Solo dígitos para comparar teléfonos (809-555-1234 → 8095551234) */
export function phoneDigits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function looksLikePhone(query: string): boolean {
  const digits = phoneDigits(query);
  return digits.length >= 7 && digits.length / query.trim().length > 0.5;
}

export function clientMatchesQuery(
  client: { name: string; code?: string; phone?: string; taxId?: string },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = phoneDigits(query);
  const nameMatch = client.name.toLowerCase().includes(q);
  const codeMatch = client.code?.toLowerCase().includes(q);
  const taxMatch = client.taxId?.includes(q);
  const phoneMatch = qDigits.length >= 3 && phoneDigits(client.phone).includes(qDigits);
  return nameMatch || !!codeMatch || !!taxMatch || phoneMatch;
}

export function splitQueryForNewClient(query: string): { name: string; phone: string } {
  const trimmed = query.trim();
  if (!trimmed) return { name: '', phone: '' };
  if (looksLikePhone(trimmed)) return { name: '', phone: trimmed };
  return { name: trimmed, phone: '' };
}
