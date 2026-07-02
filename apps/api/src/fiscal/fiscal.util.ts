/** Tipos de comprobante fiscal DGII (NCF tradicional serie B) */
export const COMPROBANTE_TYPES = [
  'B01', 'B02', 'B03', 'B04', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17',
] as const;

export type ComprobanteType = typeof COMPROBANTE_TYPES[number];

export const COMPROBANTE_LABELS: Record<ComprobanteType, string> = {
  B01: 'Factura de crédito fiscal',
  B02: 'Factura de consumo',
  B03: 'Nota de débito',
  B04: 'Nota de crédito',
  B11: 'Comprobante de compras',
  B12: 'Registro único de ingresos',
  B13: 'Comprobante para gastos menores',
  B14: 'Regímenes especiales de tributación',
  B15: 'Comprobante gubernamental',
  B16: 'Comprobante para exportaciones',
  B17: 'Comprobante para pagos al exterior',
};

/** Comprobantes que modifican otra factura */
export const MODIFICATION_TYPES: ComprobanteType[] = ['B03', 'B04'];

/** Requiere RNC del comprador */
export const REQUIRES_BUYER_RNC: ComprobanteType[] = ['B01', 'B03', 'B04', 'B14', 'B15'];

export const DEFAULT_ITBIS_RATE = 18;

export function formatNcf(type: ComprobanteType, sequence: number): string {
  return `${type}${String(sequence).padStart(8, '0')}`;
}

export function calculateTaxTotals(subtotal: number, itbisRate = DEFAULT_ITBIS_RATE) {
  const taxAmount = Math.round(subtotal * (itbisRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, totalAmount, itbisRate };
}

export function suggestComprobanteType(clientTaxId?: string | null, invoiceType?: string): ComprobanteType {
  if (clientTaxId?.trim()) return 'B01';
  return invoiceType === 'credit' ? 'B01' : 'B02';
}

export function validateComprobanteForClient(type: ComprobanteType, clientTaxId?: string | null): string | null {
  if (REQUIRES_BUYER_RNC.includes(type) && !clientTaxId?.trim()) {
    return `${COMPROBANTE_LABELS[type]} requiere RNC o cédula del cliente`;
  }
  return null;
}
