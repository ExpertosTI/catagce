import { formatCurrency } from '../common/format-currency';
import { COMPROBANTE_LABELS, ComprobanteType } from '../fiscal/fiscal.util';

export type InvoiceNotifyLine = {
  productName: string;
  quantity: number;
  unitLabel?: string | null;
  lineTotal: string;
};

export type InvoiceNotifyPayload = {
  clientId?: string;
  reference: string;
  ncf?: string | null;
  comprobanteType?: string | null;
  isFiscal?: boolean;
  invoiceType?: string;
  status?: string;
  totalAmount: string;
  paidAmount?: string | null;
  dueDate?: Date | string | null;
  issuedAt?: Date | string | null;
  clientName?: string;
  items?: InvoiceNotifyLine[];
  clientTotalBalance?: number;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
};

function formatDate(value?: Date | string | null) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function invoiceBalance(inv: Pick<InvoiceNotifyPayload, 'totalAmount' | 'paidAmount'>) {
  return Math.max(0, parseFloat(inv.totalAmount || '0') - parseFloat(inv.paidAmount || '0'));
}

function documentTitle(inv: InvoiceNotifyPayload) {
  if (inv.isFiscal === false) return 'PROFORMA';
  if (inv.comprobanteType && inv.comprobanteType in COMPROBANTE_LABELS) {
    return COMPROBANTE_LABELS[inv.comprobanteType as ComprobanteType];
  }
  return inv.invoiceType === 'credit' ? 'Factura de crédito' : 'Factura';
}

function unitText(label?: string | null) {
  const u = String(label || 'unidad').trim();
  return u && u !== 'unidad' ? ` ${u}` : '';
}

export function buildInvoiceIssuedMessage(companyName: string, inv: InvoiceNotifyPayload, portalUrl?: string) {
  const lines = (inv.items ?? []).map(
    (i) => `• ${i.productName} x${i.quantity}${unitText(i.unitLabel)} — ${formatCurrency(parseFloat(i.lineTotal))}`,
  );
  const balance = invoiceBalance(inv);
  const paid = parseFloat(inv.paidAmount || '0');

  const parts = [
    `🧾 *${companyName}*`,
    `*${documentTitle(inv)}*`,
    '',
    `Ref: *${inv.reference}*`,
    inv.ncf ? `NCF: ${inv.ncf}` : '',
    `Fecha: ${formatDate(inv.issuedAt)}`,
    inv.clientName ? `Cliente: *${inv.clientName}*` : '',
    inv.dueDate && inv.invoiceType === 'credit'
      ? `Vence: ${formatDate(inv.dueDate)}`
      : '',
    '',
  ].filter(Boolean);

  if (lines.length) parts.push(...lines, '');

  parts.push(`*Total: ${formatCurrency(inv.totalAmount)}*`);
  if (paid > 0) parts.push(`Abonado: ${formatCurrency(paid)}`);
  if (balance > 0) parts.push(`*Saldo pendiente (esta factura): ${formatCurrency(balance)}*`);
  if (balance <= 0 && paid > 0) parts.push('✅ *Factura saldada*');

  if (typeof inv.clientTotalBalance === 'number' && inv.clientTotalBalance > balance) {
    parts.push(`*Saldo total con nosotros: ${formatCurrency(inv.clientTotalBalance)}*`);
  }

  if (portalUrl) {
    parts.push('', `Consulte sus facturas: ${portalUrl}`);
  }

  parts.push('', 'Gracias por su preferencia.');
  return parts.join('\n');
}

export function buildPaymentReceivedMessage(
  companyName: string,
  inv: InvoiceNotifyPayload,
  payment: { amount: string; method?: string; reference?: string | null },
) {
  const balance = invoiceBalance(inv);
  const method = PAYMENT_METHOD_LABEL[payment.method || ''] || payment.method || 'Pago';

  const parts = [
    `✅ *${companyName}*`,
    '*Recibo de pago recibido*',
    '',
    `Factura: *${inv.ncf ?? inv.reference}*`,
    inv.clientName ? `Cliente: ${inv.clientName}` : '',
    `Método: ${method}`,
    payment.reference ? `Referencia: ${payment.reference}` : '',
    '',
    `*Monto abonado: ${formatCurrency(payment.amount)}*`,
    `Total factura: ${formatCurrency(inv.totalAmount)}`,
  ].filter(Boolean);

  if (balance > 0) {
    parts.push(`*Saldo pendiente (esta factura): ${formatCurrency(balance)}*`);
  } else {
    parts.push('✅ *Esta factura quedó saldada*');
  }

  if (typeof inv.clientTotalBalance === 'number' && inv.clientTotalBalance > 0) {
    parts.push(`*Saldo total con nosotros: ${formatCurrency(inv.clientTotalBalance)}*`);
  }

  parts.push('', 'Gracias por su pago.');
  return parts.join('\n');
}

export function buildDispatchMessage(
  companyName: string,
  data: {
    reference: string;
    clientName?: string;
    invoiceReference?: string | null;
    items: Array<{ productName: string; quantity: number }>;
  },
) {
  const lines = data.items.map((i) => `• ${i.productName} x${i.quantity}`);
  return [
    `🚚 *${companyName}*`,
    '*Despacho realizado*',
    '',
    `Ref: *${data.reference}*`,
    data.clientName ? `Cliente: ${data.clientName}` : '',
    data.invoiceReference ? `Factura: ${data.invoiceReference}` : '',
    '',
    ...lines,
    '',
    'Su mercancía fue despachada. Cualquier duda, escríbanos por aquí.',
  ].filter(Boolean).join('\n');
}
