export const EXCHANGE_RATE_RD = 58;

export function num(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function formatUsd(value: string | number | null | undefined) {
  return `US$ ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRd(value: string | number | null | undefined) {
  const rd = num(value) * EXCHANGE_RATE_RD;
  return `RD$ ${rd.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function invoiceTypeLabel(type: string) {
  if (type === 'credit') return 'FACTURA DE CRÉDITO FISCAL';
  return 'FACTURA';
}

export function invoiceBalance(total: string | number, paid: string | number | null | undefined) {
  return Math.max(0, num(total) - num(paid));
}
