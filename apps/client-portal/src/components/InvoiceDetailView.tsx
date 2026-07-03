'use client';

import Link from 'next/link';
import {
  ArrowLeft, MessageCircle, FileDown, Printer, Copy, Check, Wallet, Receipt, Package,
} from 'lucide-react';
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

  const statusCls = {
    issued: 'badge-blue',
    partially_paid: 'badge-amber',
    paid: 'badge-green',
    overdue: 'bg-red-50 text-red-700 ring-1 ring-red-100',
    cancelled: 'bg-slate-100 text-slate-600',
  }[invoice.status ?? ''] ?? 'badge-blue';

  return (
    <div className="animate-fade-in">
      <Link href={backHref} className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5">
        <ArrowLeft size={16} /> Volver a facturas
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">
            {invoice.clientName ?? invoice.client?.name}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{invoice.reference}</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {invoiceTypeLabel(invoice.invoiceType)} · {formatDate(invoice.issuedAt)}
            {invoice.ncf && <span className="ml-2 font-mono text-xs text-slate-400">NCF {invoice.ncf}</span>}
          </p>
        </div>
        {invoice.status && (
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full h-fit shrink-0 ${statusCls}`}>
            {invoiceStatusLabel[invoice.status] ?? invoice.status}
          </span>
        )}
      </div>

      <div className="action-bar mt-5">
        <button type="button" onClick={() => shareInvoiceWhatsApp(invoice, invoice.client?.phone)} className="action-chip action-chip-whatsapp">
          <MessageCircle size={16} /> <span>WhatsApp</span>
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, companyName)} className="action-chip">
          <FileDown size={16} /> <span>PDF</span>
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, companyName)} className="action-chip">
          <Printer size={16} /> <span>Imprimir</span>
        </button>
        <button type="button" onClick={handleCopy} className="action-chip">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div className="report-kpi border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1"><Wallet size={14} /> Total</p>
          <p className="report-kpi-value text-blue-700">{formatUsd(invoice.totalAmount)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Check size={14} className="text-emerald-500" /> Pagado</p>
          <p className="report-kpi-value text-emerald-700">{formatUsd(invoice.paidAmount ?? 0)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo pendiente</p>
          <p className={`report-kpi-value ${balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatUsd(balance)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Receipt size={14} /> ITBIS</p>
          <p className="report-kpi-value text-slate-700">{formatUsd(invoice.taxAmount ?? 0)}</p>
        </div>
      </div>

      <div className="executive-card mt-6 overflow-hidden !p-0">
        <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white flex items-center gap-2">
          <Package size={16} className="text-slate-500" />
          <p className="font-bold text-sm text-slate-900">Detalle de productos</p>
          <span className="text-xs text-slate-400 ml-auto">{invoice.items?.length ?? 0} líneas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-slate-500 text-xs uppercase bg-slate-50/50">
              <tr>
                <th className="text-left p-4 font-semibold">Producto</th>
                <th className="text-right p-4 font-semibold">Cant.</th>
                <th className="text-right p-4 font-semibold">P. unit.</th>
                <th className="text-right p-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <span className="font-medium text-slate-900">{item.productName}</span>
                    {item.productSku && <span className="text-slate-400 text-xs block">{item.productSku}</span>}
                  </td>
                  <td className="p-4 text-right tabular-nums">{item.quantity}</td>
                  <td className="p-4 text-right tabular-nums">{formatUsd(item.unitPrice)}</td>
                  <td className="p-4 text-right font-semibold tabular-nums">{formatUsd(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="executive-card mt-6 overflow-hidden !p-0">
          <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white flex items-center gap-2">
            <Receipt size={16} className="text-emerald-600" />
            <p className="font-bold text-sm text-slate-900">Abonos registrados</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map((p) => (
              <li key={p.id} className="px-4 py-3.5 flex justify-between gap-3 text-sm hover:bg-slate-50/80">
                <span className="text-slate-600">
                  {formatDate(p.paidAt)} · {paymentMethodLabel[p.method] ?? p.method}
                  {p.reference && ` (${p.reference})`}
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums shrink-0">{formatUsd(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {invoice.dueDate && balance > 0 && (
        <p className="text-sm text-amber-700 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          Vencimiento: {formatDate(invoice.dueDate)}
        </p>
      )}
    </div>
  );
}
