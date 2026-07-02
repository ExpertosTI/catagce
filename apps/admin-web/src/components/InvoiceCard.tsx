'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, FileDown, Eye, Copy, Check, Loader2, Wallet } from 'lucide-react';
import {
  InvoiceListItem, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary, InvoiceDetail,
  fiscalDocumentTitle,
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
  const [loading, setLoading] = useState<'wa' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);
  const company = useCompany();

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

  const statusText = invoice.status ? invoiceStatusText(invoice.status) : '';

  return (
    <article className="executive-card group">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{invoice.clientName ?? 'Cliente'}</span>
            {statusText && <span className="badge-blue text-[10px]">{statusText}</span>}
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{invoice.ncf ?? invoice.reference}</h3>
          <p className="text-sm text-slate-600">{fiscalDocumentTitle(invoice)} · {invoiceTypeLabel(invoice.invoiceType)}</p>
          <p className="text-xs text-slate-400">{formatDate(invoice.issuedAt)}{invoice.ncf ? ` · Ref. ${invoice.reference}` : ''}</p>
        </div>

        <div className="flex gap-6 lg:gap-8 shrink-0 flex-wrap">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
            <p className="text-xl font-bold text-slate-900">{formatUsd(totalAmt)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Saldo</p>
            <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatUsd(balance)}</p>
          </div>
          <div className="hidden sm:block text-right text-xs text-slate-500 space-y-1">
            <p>Subtotal {formatUsd(bruto)}</p>
            <p>ITBIS {formatUsd(itbis)}</p>
          </div>
        </div>
      </div>

      <div className="action-bar mt-4 flex-col sm:flex-row gap-2">
        {balance > 0 && (
          <Link
            href={`${detailPath}?abono=1`}
            className="btn-primary w-full sm:w-auto justify-center order-first sm:order-none text-base py-2.5"
          >
            <Wallet size={18} /> Pagar {formatUsd(balance)}
          </Link>
        )}
        <Link href={detailPath} className="btn-subtle btn-subtle-primary w-full sm:w-auto justify-center">
          <Eye size={15} /> Ver detalle
        </Link>
        <button type="button" onClick={handleWhatsApp} disabled={loading === 'wa'} className="btn-subtle flex-1 justify-center">
          {loading === 'wa' ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          WhatsApp
        </button>
        <button type="button" onClick={handlePdf} disabled={loading === 'pdf'} className="btn-subtle flex-1 justify-center">
          {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          PDF
        </button>
        <button type="button" onClick={handleCopy} className="btn-subtle flex-1 justify-center sm:ml-auto">
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </article>
  );
}
