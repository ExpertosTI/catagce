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

export function printInvoicePdf(inv: InvoiceDetail, companyName = 'General Home') {
  const items = inv.items ?? [];
  const balance = invoiceBalance(inv);
  const safeCompany = escapeHtml(companyName);
  const safeRef = escapeHtml(inv.reference);
  const safeClient = escapeHtml(inv.clientName ?? inv.client?.name ?? '—');
  const safeNotes = inv.notes ? escapeHtml(inv.notes) : '';

  const rows = items.map((i) => {
    const name = escapeHtml(i.productName ?? '');
    const sku = escapeHtml(i.productSku ?? '');
    return `<tr><td>${name}${sku ? `<br/><small>${sku}</small>` : ''}</td><td class="right">${i.quantity}</td><td class="right">${formatUsd(i.unitPrice)}</td><td class="right">${formatUsd(i.lineTotal)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>${safeRef}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #0f172a; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1e40af; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  .right { text-align: right; }
  .totals { margin-top: 20px; width: 280px; margin-left: auto; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .total-row { font-weight: 800; font-size: 16px; color: #1e40af; border-top: 2px solid #1e40af; margin-top: 8px; padding-top: 10px; }
  .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 16px; } }
</style></head><body>
  <h1>${safeCompany}</h1>
  <div class="meta">${invoiceTypeLabel(inv.invoiceType)} · ${safeRef}<br/>
  Fecha: ${formatDate(inv.issuedAt)}${inv.dueDate ? ` · Vence: ${formatDate(inv.dueDate)}` : ''}<br/>
  Cliente: ${safeClient}</div>
  <table><thead><tr><th>Producto</th><th class="right">Cant.</th><th class="right">P. unit.</th><th class="right">Total</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Bruto</span><span>${formatUsd(inv.subtotal ?? inv.totalAmount)}</span></div>
    <div><span>ITBIS</span><span>${formatUsd(inv.taxAmount ?? 0)}</span></div>
    <div><span>Pagado</span><span>${formatUsd(inv.paidAmount ?? 0)}</span></div>
    <div class="total-row"><span>Saldo pendiente</span><span>${formatUsd(balance)}</span></div>
  </div>
  ${safeNotes ? `<p><strong>Notas:</strong> ${safeNotes}</p>` : ''}
  <div class="footer">Santo Domingo, RD · Desarrollado por renace.tech</div>
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

export async function copyInvoiceSummary(inv: InvoiceDetail) {
  const text = buildInvoiceWhatsAppMessage(inv);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
