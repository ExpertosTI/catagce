'use client';

import Link from 'next/link';
import { MessageCircle, FileDown, Printer, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
  InvoiceDetail, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary,
} from '../lib/invoice-utils';
import { invoiceStatusLabel, paymentMethodLabel } from '../lib/labels';

type Props = {
  invoice: InvoiceDetail;
  backHref: string;
  companyName?: string;
};

export function InvoiceDetailView({ invoice, backHref, companyName = 'General Home' }: Props) {
  const [copied, setCopied] = useState(false);
  const balance = invoiceBalance(invoice);

  async function handleCopy() {
    const ok = await copyInvoiceSummary(invoice);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="animate-fade-in">
      <Link href={backHref} className="text-blue-700 text-sm font-medium hover:underline inline-flex items-center gap-1">
        ← Volver a facturas
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">
            {invoice.clientName ?? invoice.client?.name}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{invoice.reference}</h2>
          <p className="text-slate-500 text-sm">{invoiceTypeLabel(invoice.invoiceType)} · {formatDate(invoice.issuedAt)}</p>
        </div>
        {invoice.status && <span className="badge-blue h-fit">{invoiceStatusLabel[invoice.status] ?? invoice.status}</span>}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" onClick={() => shareInvoiceWhatsApp(invoice, invoice.client?.phone)} className="btn-action btn-action-whatsapp">
          <MessageCircle size={16} /> Enviar WhatsApp
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, companyName)} className="btn-action btn-action-secondary">
          <FileDown size={16} /> Guardar PDF
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, companyName)} className="btn-action btn-action-secondary">
          <Printer size={16} /> Imprimir
        </button>
        <button type="button" onClick={handleCopy} className="btn-action btn-action-ghost">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          {copied ? 'Copiado' : 'Copiar resumen'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {[
          { label: 'Total', value: formatUsd(invoice.totalAmount), cls: 'text-blue-700' },
          { label: 'Pagado', value: formatUsd(invoice.paidAmount ?? 0), cls: 'text-emerald-700' },
          { label: 'Saldo pendiente', value: formatUsd(balance), cls: 'text-red-600' },
          { label: 'ITBIS', value: formatUsd(invoice.taxAmount ?? 0), cls: 'text-slate-700' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">Detalle de productos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left p-4">Producto</th>
                <th className="text-right p-4">Cant.</th>
                <th className="text-right p-4">P. unit.</th>
                <th className="text-right p-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-slate-400 text-xs block">{item.productSku}</span>
                  </td>
                  <td className="p-4 text-right">{item.quantity}</td>
                  <td className="p-4 text-right">{formatUsd(item.unitPrice)}</td>
                  <td className="p-4 text-right font-semibold">{formatUsd(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="card mt-6 overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">Abonos</div>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map((p) => (
              <li key={p.id} className="px-4 py-3 flex justify-between text-sm hover:bg-slate-50/80">
                <span className="text-slate-600">{formatDate(p.paidAt)} · {paymentMethodLabel[p.method] ?? p.method} {p.reference && `(${p.reference})`}</span>
                <span className="font-semibold text-emerald-700">{formatUsd(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
