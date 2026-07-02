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

export const comprobanteTypeLabel: Record<string, string> = {
  B01: 'Factura de crédito fiscal (B01)',
  B02: 'Factura de consumo (B02)',
  B03: 'Nota de débito (B03)',
  B04: 'Nota de crédito (B04)',
  B11: 'Comprobante de compras (B11)',
  B12: 'Registro único de ingresos (B12)',
  B13: 'Gastos menores (B13)',
  B14: 'Regímenes especiales (B14)',
  B15: 'Comprobante gubernamental (B15)',
  B16: 'Exportaciones (B16)',
  B17: 'Pagos al exterior (B17)',
};

/** Comprobantes habituales en ventas B2B */
export const SALE_COMPROBANTE_OPTIONS = [
  { value: 'B01', label: 'B01 — Crédito fiscal' },
  { value: 'B02', label: 'B02 — Consumo' },
  { value: 'B14', label: 'B14 — Régimen especial' },
] as const;

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
