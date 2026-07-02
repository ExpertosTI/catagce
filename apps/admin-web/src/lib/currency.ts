const moneyFmt = new Intl.NumberFormat('es-DO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyFmtInt = new Intl.NumberFormat('es-DO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(n: number | string) {
  const v = typeof n === 'number' ? n : parseFloat(String(n).replace(/,/g, '') || '0');
  return `RD$ ${moneyFmt.format(Number.isFinite(v) ? v : 0)}`;
}

/** Solo número con comas: 1,234.56 */
export function formatAmount(n: number | string, decimals = 2) {
  const v = typeof n === 'number' ? n : parseFloat(String(n).replace(/,/g, '') || '0');
  const safe = Number.isFinite(v) ? v : 0;
  if (decimals === 0) return moneyFmtInt.format(Math.round(safe));
  return moneyFmt.format(safe);
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Formatea mientras el usuario escribe montos */
export function formatAmountInput(value: string): string {
  if (!value.trim()) return '';
  const raw = value.replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  const intPart = parts[0] ?? '';
  const decPart = parts.slice(1).join('').slice(0, 2);
  const intNum = intPart ? parseInt(intPart, 10) : 0;
  const formattedInt = intPart === '' ? '' : intNum.toLocaleString('es-DO');
  if (raw.includes('.')) return decPart.length ? `${formattedInt}.${decPart}` : `${formattedInt}.`;
  return formattedInt;
}
