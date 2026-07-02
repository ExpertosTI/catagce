export type InvoiceListItem = {
  id: string;
  reference: string;
  invoiceType: string;
  status?: string;
  subtotal?: string | null;
  taxAmount?: string | null;
  totalAmount: string;
  paidAmount?: string | null;
  issuedAt?: string | null;
  clientName?: string;
};

export type InvoiceDetail = InvoiceListItem & {
  notes?: string | null;
  dueDate?: string | null;
  client?: { name?: string; phone?: string; email?: string; code?: string };
  items?: Array<{
    id: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    dispatchedQty?: number;
  }>;
  payments?: Array<{
    id: string;
    amount: string;
    method: string;
    paidAt: string;
    reference?: string;
  }>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { formatCurrency } from './currency';

export function formatUsd(n: number | string) {
  return formatCurrency(n);
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function invoiceTypeLabel(type: string) {
  return type === 'credit' ? 'FACTURA DE CRÉDITO FISCAL' : 'FACTURA';
}

export function invoiceBalance(inv: Pick<InvoiceListItem, 'totalAmount' | 'paidAmount'>) {
  return Math.max(0, parseFloat(inv.totalAmount || '0') - parseFloat(inv.paidAmount || '0'));
}

export function buildInvoiceWhatsAppMessage(inv: InvoiceDetail, companyName = 'General Home') {
  const lines = (inv.items ?? []).map(
    (i) => `• ${i.productName} x${i.quantity} — ${formatUsd(i.lineTotal)}`,
  );
  const balance = invoiceBalance(inv);
  let msg = `*${companyName}*\n📄 *${inv.reference}*\n`;
  msg += `${invoiceTypeLabel(inv.invoiceType)}\n`;
  msg += `Fecha: ${formatDate(inv.issuedAt)}\n\n`;
  if (inv.clientName || inv.client?.name) {
    msg += `Cliente: *${inv.clientName ?? inv.client?.name}*\n\n`;
  }
  if (lines.length) msg += `${lines.join('\n')}\n\n`;
  msg += `*Total: ${formatUsd(inv.totalAmount)}*\n`;
  if (parseFloat(inv.paidAmount || '0') > 0) {
    msg += `Pagado: ${formatUsd(inv.paidAmount!)}\n`;
  }
  if (balance > 0) msg += `*Saldo pendiente: ${formatUsd(balance)}*\n`;
  msg += '\n_Generado desde GHome · renace.tech_';
  return msg;
}

export function shareInvoiceWhatsApp(inv: InvoiceDetail, phone?: string | null) {
  const msg = buildInvoiceWhatsAppMessage(inv);
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, '').replace(/^(\d{10})$/, '1$1')}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

export function printInvoicePdf(inv: InvoiceDetail, companyName = 'General Home', logoUrl?: string) {
  const items = inv.items ?? [];
  const balance = invoiceBalance(inv);
  const safeCompany = escapeHtml(companyName);
  const safeRef = escapeHtml(inv.reference);
  const safeClient = escapeHtml(inv.clientName ?? inv.client?.name ?? '—');
  const safeNotes = inv.notes ? escapeHtml(inv.notes) : '';
  const statusLabel = inv.status
    ? ({ draft: 'Borrador', issued: 'Emitida', paid: 'Pagada', partially_paid: 'Pago parcial', overdue: 'Vencida', cancelled: 'Anulada' } as Record<string, string>)[inv.status] ?? inv.status
    : null;

  const rows = items.map((i) => {
    const name = escapeHtml(i.productName ?? '');
    const sku = escapeHtml(i.productSku ?? '');
    return `<tr><td><span class="prod-name">${name}</span>${sku ? `<span class="prod-sku">${sku}</span>` : ''}</td><td class="right">${i.quantity}</td><td class="right">${formatUsd(i.unitPrice)}</td><td class="right cell-strong">${formatUsd(i.lineTotal)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>${safeRef}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 0; margin: 0; background: #f1f5f9; }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #1d4ed8, #1e3a8a); color: #fff; padding: 36px 40px 28px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .header-brand { display: flex; align-items: center; gap: 14px; }
  .header-logo { width: 52px; height: 52px; border-radius: 12px; background: #fff; object-fit: contain; padding: 4px; }
  .header-brand h1 { font-size: 20px; margin: 0; font-weight: 800; }
  .header-brand p { margin: 2px 0 0; font-size: 12px; opacity: 0.85; }
  .header-doc { text-align: right; }
  .header-doc .doc-type { font-size: 11px; letter-spacing: 0.08em; opacity: 0.8; text-transform: uppercase; }
  .header-doc .doc-ref { font-size: 22px; font-weight: 800; margin: 2px 0; }
  .status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); margin-top: 4px; }
  .meta-bar { display: flex; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; }
  .meta-block p:first-child { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
  .meta-block p:last-child { font-size: 14px; font-weight: 700; margin: 0; color: #0f172a; }
  .body { padding: 28px 40px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; padding: 0 8px 10px; border-bottom: 2px solid #e2e8f0; }
  th.right, td.right { text-align: right; }
  td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .prod-name { display: block; font-weight: 600; }
  .prod-sku { display: block; font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .cell-strong { font-weight: 700; }
  .totals { margin-top: 24px; width: 300px; margin-left: auto; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 7px 0; color: #475569; }
  .total-row { font-weight: 800; font-size: 18px; color: #1e3a8a; border-top: 2px solid #1e3a8a; margin-top: 8px; padding-top: 12px !important; }
  .balance-row { color: #dc2626 !important; font-weight: 700; }
  .notes-box { margin-top: 24px; background: #f8fafc; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #475569; }
  .footer { margin-top: 40px; padding: 20px 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  @media print {
    body { background: #fff; }
    .sheet { max-width: 100%; }
  }
</style></head><body>
  <div class="sheet">
    <div class="header">
      <div class="header-brand">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="header-logo" alt="" />` : ''}
        <div>
          <h1>${safeCompany}</h1>
          <p>Santo Domingo, República Dominicana</p>
        </div>
      </div>
      <div class="header-doc">
        <div class="doc-type">${invoiceTypeLabel(inv.invoiceType)}</div>
        <div class="doc-ref">${safeRef}</div>
        ${statusLabel ? `<span class="status-pill">${escapeHtml(statusLabel)}</span>` : ''}
      </div>
    </div>

    <div class="meta-bar">
      <div class="meta-block"><p>Cliente</p><p>${safeClient}</p></div>
      <div class="meta-block"><p>Fecha de emisión</p><p>${formatDate(inv.issuedAt)}</p></div>
      ${inv.dueDate ? `<div class="meta-block"><p>Fecha de vencimiento</p><p>${formatDate(inv.dueDate)}</p></div>` : ''}
    </div>

    <div class="body">
      <table>
        <thead><tr><th>Producto</th><th class="right">Cant.</th><th class="right">Precio unit.</th><th class="right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div><span>Subtotal</span><span>${formatUsd(inv.subtotal ?? inv.totalAmount)}</span></div>
        <div><span>ITBIS</span><span>${formatUsd(inv.taxAmount ?? 0)}</span></div>
        <div><span>Pagado</span><span>${formatUsd(inv.paidAmount ?? 0)}</span></div>
        <div class="total-row balance-row"><span>Saldo pendiente</span><span>${formatUsd(balance)}</span></div>
      </div>

      ${safeNotes ? `<div class="notes-box"><strong>Notas:</strong> ${safeNotes}</div>` : ''}
    </div>

    <div class="footer">Santo Domingo, RD · Documento generado por GHome · Desarrollado por renace.tech</div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('Permita ventanas emergentes para imprimir o guardar como PDF.');
    return;
  }

  win.addEventListener('load', () => {
    win.focus();
    win.print();
  });
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch { /* noop */ }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, 800);
}

export type PaymentReceipt = {
  id: string;
  amount: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  invoiceReference: string;
  clientName?: string;
  clientPhone?: string | null;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', check: 'Cheque', other: 'Otro',
};

export function buildPaymentReceiptMessage(p: PaymentReceipt, companyName = 'General Home') {
  let msg = `*${companyName}*\n🧾 *Recibo de pago*\n\n`;
  msg += `Factura: *${p.invoiceReference}*\n`;
  if (p.clientName) msg += `Cliente: ${p.clientName}\n`;
  msg += `Fecha: ${formatDate(p.paidAt)}\n`;
  msg += `Método: ${PAYMENT_METHOD_LABEL[p.method] ?? p.method}\n`;
  if (p.reference) msg += `Referencia: ${p.reference}\n`;
  msg += `\n*Monto abonado: ${formatUsd(p.amount)}*\n`;
  msg += '\n_Generado desde GHome · renace.tech_';
  return msg;
}

export function sharePaymentReceiptWhatsApp(p: PaymentReceipt, companyName?: string) {
  const msg = buildPaymentReceiptMessage(p, companyName);
  const url = p.clientPhone
    ? `https://wa.me/${p.clientPhone.replace(/\D/g, '').replace(/^(\d{10})$/, '1$1')}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

export function printPaymentReceipt(p: PaymentReceipt, companyName = 'General Home', logoUrl?: string) {
  const safeCompany = escapeHtml(companyName);
  const safeRef = escapeHtml(p.invoiceReference);
  const safeClient = escapeHtml(p.clientName ?? '—');
  const safeMethod = escapeHtml(PAYMENT_METHOD_LABEL[p.method] ?? p.method);

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>Recibo ${safeRef}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 0; margin: 0; background: #f1f5f9; }
  .sheet { max-width: 480px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #059669, #047857); color: #fff; padding: 32px; text-align: center; }
  .header-logo { width: 48px; height: 48px; border-radius: 10px; background: #fff; object-fit: contain; padding: 4px; margin: 0 auto 10px; display: block; }
  .header h1 { margin: 0; font-size: 18px; font-weight: 800; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
  .amount { text-align: center; padding: 28px 20px 8px; }
  .amount .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .amount .value { font-size: 34px; font-weight: 800; color: #047857; margin-top: 6px; }
  .details { padding: 20px 32px 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row span:first-child { color: #64748b; }
  .row span:last-child { font-weight: 600; }
  .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  @media print { body { background: #fff; } }
</style></head><body>
  <div class="sheet">
    <div class="header">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="header-logo" alt="" />` : ''}
      <h1>${safeCompany}</h1>
      <p>Recibo de pago</p>
    </div>
    <div class="amount">
      <p class="label">Monto abonado</p>
      <p class="value">${formatUsd(p.amount)}</p>
    </div>
    <div class="details">
      <div class="row"><span>Factura</span><span>${safeRef}</span></div>
      <div class="row"><span>Cliente</span><span>${safeClient}</span></div>
      <div class="row"><span>Fecha</span><span>${formatDate(p.paidAt)}</span></div>
      <div class="row"><span>Método</span><span>${safeMethod}</span></div>
      ${p.reference ? `<div class="row"><span>Referencia</span><span>${escapeHtml(p.reference)}</span></div>` : ''}
    </div>
    <div class="footer">Santo Domingo, RD · Documento generado por GHome · Desarrollado por renace.tech</div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('Permita ventanas emergentes para imprimir o guardar como PDF.');
    return;
  }
  win.addEventListener('load', () => { win.focus(); win.print(); });
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { /* noop */ }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, 800);
}

export async function copyInvoiceSummary(inv: InvoiceDetail) {
  const text = buildInvoiceWhatsAppMessage(inv);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
