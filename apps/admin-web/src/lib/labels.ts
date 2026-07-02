export const clientStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  suspended: 'Suspendido',
};

export const invoiceStatusLabel: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
  partially_paid: 'Parcial',
  cancelled: 'Anulada',
};

export function formatMoney(n: number | string) {
  const v = typeof n === 'number' ? n : parseFloat(n || '0');
  return `US$ ${(Number.isFinite(v) ? v : 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
