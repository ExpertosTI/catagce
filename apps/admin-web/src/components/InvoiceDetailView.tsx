'use client';

import Link from 'next/link';
import { MessageCircle, FileDown, Printer, Copy, Check, Plus, X, Receipt, Ban, FileMinus, Wallet, ArrowLeft, User, FileText, Package, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  InvoiceDetail, formatUsd, formatDate, invoiceTypeLabel, invoiceBalance,
  shareInvoiceWhatsApp, printInvoicePdf, copyInvoiceSummary,
  printPaymentReceipt, sharePaymentReceiptWhatsApp, fiscalDocumentTitle,
} from '../lib/invoice-utils';
import { invoiceStatusText, paymentMethodLabel } from '../lib/labels';
import { unitLabelText } from '../lib/units';
import { useCompany } from '../lib/useCompany';
import { apiFetch } from '../lib/api';
import { formatAmount } from '../lib/currency';
import { CurrencyInput } from './CurrencyInput';
import { useAppDialog } from './AppDialogProvider';

type Props = {
  invoice: InvoiceDetail;
  backHref: string;
  companyName?: string;
  canManagePayments?: boolean;
  initialShowPayment?: boolean;
  initialPrintReceipt?: boolean;
  onInvoiceUpdated?: (invoice: InvoiceDetail) => void;
};

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

export function InvoiceDetailView({ invoice, backHref, companyName, canManagePayments, initialShowPayment, initialPrintReceipt, onInvoiceUpdated }: Props) {
  const [copied, setCopied] = useState(false);
  const balance = invoiceBalance(invoice);
  const company = useCompany();
  const { confirm, alert } = useAppDialog();
  const resolvedName = companyName ?? company?.name ?? 'General Home';
  const autoReceipt = company?.settings?.autoReceiptOnPayment !== false;
  const [showPaymentForm, setShowPaymentForm] = useState(initialShowPayment ?? false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNumeric, setPaymentNumeric] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false);
  const [creditNoteSaving, setCreditNoteSaving] = useState(false);
  const [receivedBy, setReceivedBy] = useState(invoice.receivedBy ?? '');
  const [dispatchedBy, setDispatchedBy] = useState(invoice.dispatchedBy ?? '');
  const [metaSaving, setMetaSaving] = useState(false);

  const canIssueCreditNote = ['B01', 'B02', 'B14'].includes(invoice.comprobanteType ?? '') && invoice.status !== 'cancelled';

  useEffect(() => {
    setReceivedBy(invoice.receivedBy ?? '');
    setDispatchedBy(invoice.dispatchedBy ?? '');
  }, [invoice.id, invoice.receivedBy, invoice.dispatchedBy]);

  useEffect(() => {
    if (initialShowPayment && balance > 0) {
      setPaymentAmount(formatAmount(balance));
      setPaymentNumeric(balance);
    }
  }, [initialShowPayment, balance, invoice.id]);

  useEffect(() => {
    if (!initialPrintReceipt || !autoReceipt) return;
    const payments = invoice.payments ?? [];
    const latest = payments[payments.length - 1];
    if (!latest) return;
    printPaymentReceipt({
      id: latest.id,
      amount: latest.amount,
      method: latest.method,
      reference: latest.reference,
      paidAt: latest.paidAt,
      invoiceReference: invoice.ncf ?? invoice.reference,
      clientName: invoice.clientName ?? invoice.client?.name,
    }, resolvedName, company?.logoUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cargar con ?receipt=1
  }, [initialPrintReceipt, invoice.id]);

  async function handleCopy() {
    const ok = await copyInvoiceSummary(invoice);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function maybePrintReceipt(updated: InvoiceDetail, amount: number) {
    if (!autoReceipt) return;
    const payments = updated.payments ?? [];
    const latest = payments[payments.length - 1];
    if (!latest) return;
    printPaymentReceipt({
      id: latest.id,
      amount: latest.amount,
      method: latest.method,
      reference: latest.reference,
      paidAt: latest.paidAt,
      invoiceReference: updated.ncf ?? updated.reference,
      clientName: updated.clientName ?? updated.client?.name,
    }, resolvedName, company?.logoUrl);
  }

  function openPaymentForm() {
    setPaymentAmount(formatAmount(balance));
    setPaymentNumeric(balance);
    setShowPaymentForm(true);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = paymentNumeric;
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
      const normalized = { ...updated, clientName: updated.client?.name ?? updated.clientName };
      onInvoiceUpdated?.(normalized);
      maybePrintReceipt(normalized, amount);
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentNumeric(0);
      setPaymentRef('');
      setPaymentNotes('');
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setPaymentSaving(false);
    }
  }

  async function saveSignatures() {
    setMetaSaving(true);
    try {
      const updated = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ receivedBy, dispatchedBy }),
      });
      onInvoiceUpdated?.({ ...updated, clientName: updated.client?.name ?? updated.clientName });
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudieron guardar los datos', variant: 'error' });
    } finally {
      setMetaSaving(false);
    }
  }

  async function voidPayment(paymentId: string) {
    const ok = await confirm({
      title: 'Anular pago',
      message: '¿Anular este pago? Esta acción no se puede deshacer.',
      confirmLabel: 'Anular',
      variant: 'danger',
    });
    if (!ok) return;
    setVoidingId(paymentId);
    try {
      const updated = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}/payments/${paymentId}`, { method: 'DELETE' });
      onInvoiceUpdated?.({ ...updated, clientName: updated.client?.name ?? updated.clientName });
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo anular el pago', variant: 'error' });
    } finally {
      setVoidingId(null);
    }
  }

  async function issueCreditNote() {
    if (!creditNoteReason.trim()) {
      setShowCreditNoteForm(true);
      return;
    }
    const ok = await confirm({
      title: 'Nota de crédito',
      message: '¿Emitir nota de crédito (B04) por el total de esta factura?',
      confirmLabel: 'Emitir',
    });
    if (!ok) return;
    setCreditNoteSaving(true);
    try {
      const note = await apiFetch<InvoiceDetail>(`/invoices/${invoice.id}/credit-note`, {
        method: 'POST',
        body: JSON.stringify({ modificationReason: creditNoteReason.trim() }),
      });
      await alert({ title: 'Nota emitida', message: `Nota de crédito emitida: ${note.ncf ?? note.reference}`, variant: 'success' });
      setShowCreditNoteForm(false);
      setCreditNoteReason('');
      onInvoiceUpdated?.(invoice);
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo emitir la nota de crédito', variant: 'error' });
    } finally {
      setCreditNoteSaving(false);
    }
  }

  return (
    <div className="animate-fade-in pb-24 sm:pb-0">
      <Link href={backHref} className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5">
        <ArrowLeft size={16} /> Volver a facturas
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1.5">
            <User size={12} /> {invoice.clientName ?? invoice.client?.name}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileText size={22} className="text-blue-600 shrink-0" />
            {invoice.ncf ?? invoice.reference}
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
          <span className="badge-blue h-fit">{invoiceStatusText(invoice.status)}</span>
        )}
      </div>

      <div className="action-bar mt-4">
        {canManagePayments && balance > 0 && (
          <button type="button" onClick={() => showPaymentForm ? setShowPaymentForm(false) : openPaymentForm()} className="action-chip action-chip-success">
            {showPaymentForm ? <X size={16} /> : <Wallet size={16} />}
            <span>{showPaymentForm ? 'Cerrar' : 'Pagar'}</span>
          </button>
        )}
        <button type="button" onClick={() => shareInvoiceWhatsApp(invoice, invoice.client?.phone)} className="action-chip action-chip-whatsapp">
          <MessageCircle size={16} /> <span>WhatsApp</span>
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, resolvedName, company?.logoUrl, company?.taxId)} className="action-chip">
          <FileDown size={16} /> <span>PDF</span>
        </button>
        <button type="button" onClick={() => printInvoicePdf(invoice, resolvedName, company?.logoUrl, company?.taxId)} className="action-chip">
          <Printer size={16} /> <span>Imprimir</span>
        </button>
        <button type="button" onClick={handleCopy} className="action-chip">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
        {canIssueCreditNote && (
          <button type="button" onClick={() => setShowCreditNoteForm(true)} disabled={creditNoteSaving} className="action-chip ml-auto disabled:opacity-50">
            <FileMinus size={16} /> <span>{creditNoteSaving ? 'Emitiendo...' : 'Nota de crédito'}</span>
          </button>
        )}
      </div>

      {showCreditNoteForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); issueCreditNote(); }}
          className="card p-4 mt-4 space-y-3 max-w-md"
        >
          <p className="font-semibold text-slate-800">Nota de crédito (B04)</p>
          <div>
            <label className="form-label">Motivo</label>
            <input
              value={creditNoteReason}
              onChange={(e) => setCreditNoteReason(e.target.value)}
              className="input"
              placeholder="Devolución, error, descuento..."
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreditNoteForm(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={creditNoteSaving} className="btn-primary flex-1 disabled:opacity-50">
              {creditNoteSaving ? 'Emitiendo...' : 'Continuar'}
            </button>
          </div>
        </form>
      )}

      {canManagePayments && balance > 0 && !showPaymentForm && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Saldo pendiente: {formatUsd(balance)}</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">Registre el pago para actualizar el estado de la factura</p>
          </div>
          <button type="button" onClick={openPaymentForm} className="btn-primary text-sm shrink-0">
            <Wallet size={15} /> Pagar
          </button>
        </div>
      )}

      {showPaymentForm && (
        <form onSubmit={submitPayment} className="form-card p-4 mt-4 space-y-3 max-w-md">
          <p className="font-semibold text-slate-800 flex items-center gap-2"><Wallet size={16} /> Registrar pago</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Monto</label>
              <CurrencyInput
                value={paymentAmount}
                onChange={(num, display) => { setPaymentNumeric(num); setPaymentAmount(display); }}
                placeholder={formatAmount(balance)}
                autoFocus
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
            <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="input" placeholder="Observaciones del pago" />
          </div>
          {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowPaymentForm(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={paymentSaving} className="btn-primary flex-1 disabled:opacity-50">
              {paymentSaving ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
          {autoReceipt && <p className="text-xs text-slate-400">Se generará el recibo automáticamente al confirmar.</p>}
        </form>
      )}

      <div className="card p-4 mt-4 space-y-3 max-w-lg">
        <p className="font-semibold text-sm text-slate-800 flex items-center gap-2"><PenLine size={16} className="text-slate-500" /> Recibido por / Despachado por</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label">Recibido por</label>
            <input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="input text-sm" placeholder="Nombre de quien recibe" />
          </div>
          <div>
            <label className="form-label">Despachado por</label>
            <input value={dispatchedBy} onChange={(e) => setDispatchedBy(e.target.value)} className="input text-sm" placeholder="Nombre de quien despacha" />
          </div>
        </div>
        <button type="button" onClick={saveSignatures} disabled={metaSaving} className="btn-secondary text-sm disabled:opacity-50">
          {metaSaving ? 'Guardando...' : 'Guardar firmas'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
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
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left p-4">Producto</th>
                <th className="text-right p-4">Cant.</th>
                <th className="text-right p-4">Unidad</th>
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
                  <td className="p-4 text-right text-slate-500">{unitLabelText(item.unitLabel)}</td>
                  <td className="p-4 text-right">{formatUsd(item.unitPrice)}</td>
                  <td className="p-4 text-right font-semibold">{formatUsd(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="executive-card mt-6 overflow-hidden !p-0">
          <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white flex items-center gap-2">
            <Wallet size={16} className="text-emerald-600" />
            <p className="font-bold text-sm text-slate-900">Pagos registrados</p>
          </div>
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
                      paidAt: p.paidAt, invoiceReference: invoice.ncf ?? invoice.reference,
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
                      title="Anular pago"
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

      {canManagePayments && balance > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 border-t border-slate-200/80 backdrop-blur-xl sm:hidden z-40 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
          <button type="button" onClick={openPaymentForm} className="btn-primary w-full text-base py-3.5 shadow-lg shadow-blue-700/25">
            <Wallet size={18} /> Pagar {formatUsd(balance)}
          </button>
        </div>
      )}
    </div>
  );
}
