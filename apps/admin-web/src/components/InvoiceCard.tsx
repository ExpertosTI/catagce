'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, FileDown, Eye, Copy, Check, Loader2 } from 'lucide-react';
import {
  InvoiceListItem, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary, InvoiceDetail,
} from '../lib/invoice-utils';
import { apiFetch } from '../lib/api';

type Props = {
  invoice: InvoiceListItem;
  detailPath: string;
  fetchPath: string;
};

export function InvoiceCard({ invoice, detailPath, fetchPath }: Props) {
  const [loading, setLoading] = useState<'wa' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);

  const bruto = parseFloat(invoice.subtotal || invoice.totalAmount || '0');
  const itbis = parseFloat(invoice.taxAmount || '0');
  const totalAmt = parseFloat(invoice.totalAmount || '0');
  const balance = invoiceBalance(invoice);

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

  async function handlePdf() {
    setLoading('pdf');
    const detail = await loadDetail();
    setLoading(null);
    if (!detail) return;
    printInvoicePdf(detail);
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

  return (
    <article className="invoice-card group">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-emerald-600 font-bold text-xs uppercase tracking-wide truncate">
              {invoice.clientName ?? 'Cliente'}
            </p>
            {invoice.status && (
              <span className="badge-blue capitalize text-[10px]">{invoice.status.replace(/_/g, ' ')}</span>
            )}
          </div>
          <p className="text-blue-700 font-bold text-base mt-1">{invoice.reference}</p>
          <p className="text-xs text-slate-500 mt-0.5">{invoiceTypeLabel(invoice.invoiceType)}</p>
          <p className="text-xs text-slate-400">{formatDate(invoice.issuedAt)}</p>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-600 sm:text-right shrink-0">
          <span className="text-slate-400">Bruto</span><span className="col-span-2 sm:col-span-1 font-medium">{formatUsd(bruto)}</span>
          <span className="text-slate-400">ITBIS</span><span className="col-span-2 sm:col-span-1 font-medium">{formatUsd(itbis)}</span>
          <span className="text-slate-400">Balance</span><span className="col-span-2 sm:col-span-1 font-semibold text-red-600">{formatUsd(balance)}</span>
        </div>

        <div className="text-right shrink-0">
          <p className="text-red-600 font-extrabold text-lg">{formatUsd(totalAmt)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
        <Link href={detailPath} className="btn-action btn-action-primary">
          <Eye size={15} /> Ver
        </Link>
        <button type="button" onClick={handleWhatsApp} disabled={loading === 'wa'} className="btn-action btn-action-whatsapp">
          {loading === 'wa' ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          WhatsApp
        </button>
        <button type="button" onClick={handlePdf} disabled={loading === 'pdf'} className="btn-action btn-action-secondary">
          {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          PDF
        </button>
        <button type="button" onClick={handleCopy} className="btn-action btn-action-ghost">
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </article>
  );
}
