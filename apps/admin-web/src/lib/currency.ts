export function formatCurrency(n: number | string) {
  const v = typeof n === 'number' ? n : parseFloat(n || '0');
  return `RD$ ${(Number.isFinite(v) ? v : 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
