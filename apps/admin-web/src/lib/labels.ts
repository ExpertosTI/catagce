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
  overdue: 'Vencida',
  cancelled: 'Anulada',
};

export const dispatchStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const paymentMethodLabel: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
};

export const importStatusLabel: Record<string, string> = {
  in_transit: 'En tránsito',
  customs: 'En aduana',
  received: 'Recibido',
  closed: 'Cerrado',
};

export const presaleStatusLabel: Record<string, string> = {
  open: 'Abierta',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  converted: 'Convertida',
  cancelled: 'Cancelada',
};

export function formatMoney(n: number | string) {
  const v = typeof n === 'number' ? n : parseFloat(n || '0');
  return `RD$ ${(Number.isFinite(v) ? v : 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
