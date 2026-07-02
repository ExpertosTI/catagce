'use client';

import Link from 'next/link';
import { MessageCircle, FileDown, Printer, Copy, Check, Plus, X, Receipt, Ban, FileMinus } from 'lucide-react';
import { useState } from 'react';
import {
  InvoiceDetail, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary,
  printPaymentReceipt, sharePaymentReceiptWhatsApp, fiscalDocumentTitle,
} from '../lib/invoice-utils';
import { invoiceStatusLabel, paymentMethodLabel } from '../lib/labels';
import { useCompany } from '../lib/useCompany';
import { apiFetch } from '../lib/api';

type Props = {
  invoice: InvoiceDetail;
  backHref: string;
  companyName?: string;
  canManagePayments?: boolean;
  initialShowPayment?: boolean;
  onInvoiceUpdated?: (invoice: InvoiceDetail) => void;
};

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

export function InvoiceDetailView({ invoice, backHref, companyName, canManagePayments, initialShowPayment, onInvoiceUpdated }: Props) {
  const [copied, setCopied] = useState(false);
  const balance = invoiceBalance(invoice);
  const company = useCompany();
  const resolvedName = companyName ?? company?.name ?? 'General Home';
  const [showPaymentForm, setShowPaymentForm] = useState(initialShowPayment ?? false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [creditNoteSaving, setCreditNoteSaving] = useState(false);

  const canIssueCreditNote = ['B01', 'B02', 'B14'].includes(invoice.comprobanteType ?? '') && invoice.status !== 'cancelled';

  async function handleCopy() {
    const ok = await copyInvoiceSummary(invoice);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Ingrese un monto válido');
      return;
    }
    setPaymentSaving(true);
    setPaymentError('');
    try {
      const updated = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount, method: paymentMethod, reference: paymentRef || undefined, notes: paymentNotes || undefined }),
      });
      onInvoiceUpdated?.({ ...updated, clientName: updated.client?.name ?? updated.clientName });
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
    } finally {
      setPaymentSaving(false);
    }
  }

  async function voidPayment(paymentId: string) {
    if (!confirm('¿Anular este abono? Esta acción no se puede deshacer.')) return;
    setVoidingId(paymentId);
    try {
      const updated = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}/payments/${paymentId}`, { method: 'DELETE' });
      onInvoiceUpdated?.({ ...updated, clientName: updated.client?.name ?? updated.clientName });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo anular el abono');
    } finally {
      setVoidingId(null);
    }
  }

  async function issueCreditNote() {
    const reason = prompt('Motivo de la nota de crédito (devolución, error, descuento, etc.):');
    if (!reason?.trim()) return;
    if (!confirm('¿Emitir nota de crédito (B04) por el total de esta factura?')) return;
    setCreditNoteSaving(true);
    try {
      const note = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}/credit-note`, {
        method: 'POST',
        body: JSON.stringify({ modificationReason: reason.trim() }),
      });
      alert(`Nota de crédito emitida: ${note.ncf ?? note.reference}`);
      onInvoiceUpdated?.(invoice);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo emitir la nota de crédito');
    } finally {
      setCreditNoteSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <Link href={backHref} className="text-blue-700 text-sm font-medium hover:underline inline-flex items-center gap-1">
        ← 🧾 Volver a facturas
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1">
            <span aria-hidden>👤</span> {invoice.clientName ?? invoice.client?.name}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span aria-hidden>🧾</span> {invoice.ncf ?? invoice.reference}
          </h2>
          <p className="text-slate-500 text-sm">
            {fiscalDocumentTitle(invoice)} · {invoiceTypeLabel(invoice.invoiceType)} · {formatDate(invoice.issuedAt)}
          </p>
          {invoice.ncf && <p className="text-xs text-slate-400 mt-0.5">Ref. interna: {invoice.reference}</p>}
          {invoice.relatedInvoice && (
            <p className="text-xs text-amber-700 mt-1">
              Modifica factura {invoice.relatedInvoice.ncf ?? invoice.relatedInvoice.reference}
              {invoice.modificationReason ? ` — ${invoice.modificationReason}` : ''}
            </p>
          )}
        </div>
        {invoice.status && (
          <span className="badge-blue h-fit">{invoiceStatusLabel[invoice.status] ?? invoice.status}</span>
        )}
      </div>

      <div className="action-bar mt-4">
        {canManagePayments && balance > 0 && (
          <button type="button" onClick={() => setShowPaymentForm((v) => !v)} className="btn-subtle btn-subtle-success">
            {showPaymentForm ? <X size={15} /> : <Plus size={15} />} Registrar abono
          </button>
        )}
        <button type="button" onClick={() => shareInvoiceWhatsApp(invoice, invoice.client?.phone)} className="btn-subtle">
          <MessageCircle size={15} /> WhatsApp
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, resolvedName, company?.logoUrl, company?.taxId)} className="btn-subtle">
          <FileDown size={15} /> PDF
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, resolvedName, company?.logoUrl, company?.taxId)} className="btn-subtle">
          <Printer size={15} /> Imprimir
        </button>
        <button type="button" onClick={handleCopy} className="btn-subtle">
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        {canIssueCreditNote && (
          <button type="button" onClick={issueCreditNote} disabled={creditNoteSaving} className="btn-subtle ml-auto disabled:opacity-50">
            <FileMinus size={15} /> {creditNoteSaving ? 'Emitiendo...' : 'Nota de crédito'}
          </button>
        )}
      </div>

      {canManagePayments && balance > 0 && !showPaymentForm && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Saldo pendiente: {formatUsd(balance)}</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">Registre un abono para actualizar el estado de la factura</p>
          </div>
          <button type="button" onClick={() => setShowPaymentForm(true)} className="btn-primary text-sm shrink-0">
            <Plus size={15} /> Registrar abono
          </button>
        </div>
      )}

      {showPaymentForm && (
        <form onSubmit={submitPayment} className="card p-4 mt-4 space-y-3 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Monto abonado</label>
              <input
                type="number" step="0.01" min="0" max={balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="input" placeholder={balance.toFixed(2)} autoFocus required
              />
            </div>
            <div>
              <label className="form-label">Método</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Referencia (opcional)</label>
            <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="input" placeholder="N.º de comprobante" />
          </div>
          <div>
            <label className="form-label">Notas (opcional)</label>
            <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="input" placeholder="Observaciones del abono" />
          </div>
          {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowPaymentForm(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={paymentSaving} className="btn-primary flex-1 disabled:opacity-50">
              {paymentSaving ? 'Guardando...' : 'Registrar abono'}
            </button>
          </div>
        </form>
      )}

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
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">📦 Detalle de productos</div>
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
          <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">💰 Abonos</div>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map((p) => (
              <li key={p.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm hover:bg-slate-50/80">
                <span className="text-slate-600">{formatDate(p.paidAt)} · {paymentMethodLabel[p.method] ?? p.method} {p.reference && `(${p.reference})`}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-700">{formatUsd(p.amount)}</span>
                  <button
                    type="button"
                    title="Imprimir recibo"
                    onClick={() => printPaymentReceipt({
                      id: p.id, amount: p.amount, method: p.method, reference: p.reference,
                      paidAt: p.paidAt, invoiceReference: invoice.reference,
                      clientName: invoice.clientName ?? invoice.client?.name,
                    }, resolvedName, company?.logoUrl)}
                    className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  >
                    <Receipt size={15} />
                  </button>
                  <button
                    type="button"
                    title="Enviar recibo por WhatsApp"
                    onClick={() => sharePaymentReceiptWhatsApp({
                      id: p.id, amount: p.amount, method: p.method, reference: p.reference,
                      paidAt: p.paidAt, invoiceReference: invoice.reference,
                      clientName: invoice.clientName ?? invoice.client?.name, clientPhone: invoice.client?.phone,
                    }, resolvedName)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <MessageCircle size={15} />
                  </button>
                  {canManagePayments && (
                    <button
                      type="button"
                      title="Anular abono"
                      disabled={voidingId === p.id}
                      onClick={() => voidPayment(p.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Ban size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
