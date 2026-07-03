'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, FileDown, Eye, Copy, Check, Loader2, Wallet, BellRing } from 'lucide-react';
import {
  InvoiceListItem, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, sharePaymentReminderWhatsApp, printInvoicePdf,
  copyInvoiceSummary, InvoiceDetail, fiscalDocumentTitle,
} from '../lib/invoice-utils';
import { apiFetch } from '../lib/api';
import { useCompany } from '../lib/useCompany';
import { invoiceStatusText } from '../lib/labels';

type Props = {
  invoice: InvoiceListItem;
  detailPath: string;
  fetchPath: string;
};

export function InvoiceCard({ invoice, detailPath, fetchPath }: Props) {
  const [loading, setLoading] = useState<'wa' | 'pdf' | 'reminder' | null>(null);
  const [copied, setCopied] = useState(false);
  const company = useCompany();

  const totalAmt = parseFloat(invoice.totalAmount || '0');
  const balance = invoiceBalance(invoice);
  const statusText = invoice.status ? invoiceStatusText(invoice.status) : '';

  async function loadDetail(): Promise<InvoiceDetail | null> {
    try {
      return await apiFetch<InvoiceDetail>(fetchPath);
    } catch {
      return null;
    }
  }

  async function handleWhatsApp() {
    setLoading('wa');
    const detail = await loadDetail();
    setLoading(null);
    if (!detail) return;
    shareInvoiceWhatsApp(detail, detail.client?.phone);
  }

  async function handleReminder() {
    setLoading('reminder');
    const detail = await loadDetail();
    setLoading(null);
    if (!detail) return;
    sharePaymentReminderWhatsApp(detail, detail.client?.phone, company?.name);
  }

  async function handlePdf() {
    setLoading('pdf');
    const detail = await loadDetail();
    setLoading(null);
    if (!detail) return;
    printInvoicePdf(detail, company?.name, company?.logoUrl, company?.taxId);
  }

  async function handleCopy() {
    const detail = await loadDetail();
    if (!detail) return;
    const ok = await copyInvoiceSummary(detail);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const statusCls = invoice.status === 'overdue' ? 'bg-red-50 text-red-700 ring-red-100'
    : invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : 'badge-blue';

  return (
    <article className="executive-card group hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{invoice.clientName ?? 'Cliente'}</span>
            {statusText && <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${statusCls}`}>{statusText}</span>}
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{invoice.ncf ?? invoice.reference}</h3>
          <p className="text-sm text-slate-600">{fiscalDocumentTitle(invoice)} · {invoiceTypeLabel(invoice.invoiceType)}</p>
          <p className="text-xs text-slate-400">{formatDate(invoice.issuedAt)}{invoice.ncf ? ` · Ref. ${invoice.reference}` : ''}</p>
        </div>

        <div className="flex gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{formatUsd(totalAmt)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Saldo</p>
            <p className={`text-xl font-extrabold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatUsd(balance)}</p>
          </div>
        </div>
      </div>

      {totalAmt > 0 && (
        <div className="flex items-center gap-2.5 mt-3">
          <div className="pay-progress-track flex-1">
            <div className="pay-progress-fill" style={{ width: `${Math.min(100, Math.round(((totalAmt - balance) / totalAmt) * 100))}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
            {Math.min(100, Math.round(((totalAmt - balance) / totalAmt) * 100))}% cobrado
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {balance > 0 && (
          <Link href={`${detailPath}?abono=1`} className="btn-primary w-full sm:w-auto justify-center order-first sm:order-none">
            <Wallet size={16} /> Pagar {formatUsd(balance)}
          </Link>
        )}
        <Link href={detailPath} className="action-chip action-chip-success">
          <Eye size={15} /> <span className="!inline">Ver</span>
        </Link>
        <button type="button" onClick={handleWhatsApp} disabled={loading === 'wa'} className="action-chip action-chip-whatsapp disabled:opacity-50">
          {loading === 'wa' ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          <span className="!inline">WhatsApp</span>
        </button>
        {balance > 0 && (
          <button
            type="button"
            onClick={handleReminder}
            disabled={loading === 'reminder'}
            className="action-chip !text-amber-700 !border-amber-200 hover:!bg-amber-50 disabled:opacity-50"
            title="Enviar recordatorio de pago por WhatsApp"
          >
            {loading === 'reminder' ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
            <span className="!inline">Recordar</span>
          </button>
        )}
        <button type="button" onClick={handlePdf} disabled={loading === 'pdf'} className="action-chip disabled:opacity-50">
          {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          <span className="!inline">PDF</span>
        </button>
        <button type="button" onClick={handleCopy} className="action-chip sm:ml-auto">
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          <span className="!inline">{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </article>
  );
}
