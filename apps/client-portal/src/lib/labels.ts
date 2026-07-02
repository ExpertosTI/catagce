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
  B01: 'Factura de crédito fiscal',
  B02: 'Factura de consumo',
  B03: 'Nota de débito',
  B04: 'Nota de crédito',
  B14: 'Regímenes especiales',
};
