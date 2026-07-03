'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, FileDown, Eye, Copy, Check, Loader2 } from 'lucide-react';
import {
  InvoiceListItem, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary, InvoiceDetail,
} from '../lib/invoice-utils';
import { apiFetch } from '../lib/api';
import { invoiceStatusLabel } from '../lib/labels';

type Props = {
  invoice: InvoiceListItem;
  detailPath: string;
  fetchPath: string;
};

export function InvoiceCard({ invoice, detailPath, fetchPath }: Props) {
  const [loading, setLoading] = useState<'wa' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);

  const balance = invoiceBalance(invoice);
  const totalAmt = parseFloat(invoice.totalAmount || '0');

  const statusCls = {
    issued: 'badge-blue',
    partially_paid: 'badge-amber',
    paid: 'badge-green',
    overdue: 'bg-red-50 text-red-700 ring-1 ring-red-100',
    cancelled: 'bg-slate-100 text-slate-600',
  }[invoice.status ?? ''] ?? 'badge-blue';

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
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>
                {invoiceStatusLabel[invoice.status] ?? invoice.status}
              </span>
            )}
          </div>
          <p className="text-blue-700 font-bold text-base mt-1">{invoice.reference}</p>
          <p className="text-xs text-slate-500 mt-0.5">{invoiceTypeLabel(invoice.invoiceType)} · {formatDate(invoice.issuedAt)}</p>
        </div>

        <div className="text-right shrink-0 sm:pl-4">
          <p className="text-xl font-extrabold text-slate-900 tabular-nums">{formatUsd(totalAmt)}</p>
          {balance > 0 && (
            <p className="text-sm font-semibold text-red-600 tabular-nums mt-0.5">Saldo {formatUsd(balance)}</p>
          )}
        </div>
      </div>

      <div className="action-bar mt-4 !p-2">
        <Link href={detailPath} className="action-chip action-chip-success">
          <Eye size={16} /> <span>Ver</span>
        </Link>
        <button type="button" onClick={handleWhatsApp} disabled={loading === 'wa'} className="action-chip action-chip-whatsapp disabled:opacity-50">
          {loading === 'wa' ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          <span>WhatsApp</span>
        </button>
        <button type="button" onClick={handlePdf} disabled={loading === 'pdf'} className="action-chip disabled:opacity-50">
          {loading === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          <span>PDF</span>
        </button>
        <button type="button" onClick={handleCopy} className="action-chip">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </article>
  );
}
