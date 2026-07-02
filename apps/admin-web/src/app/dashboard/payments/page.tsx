'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Receipt, MessageCircle, Ban, Search } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { paymentMethodLabel } from '../../../lib/labels';
import { printPaymentReceipt, sharePaymentReceiptWhatsApp } from '../../../lib/invoice-utils';
import { useCompany } from '../../../lib/useCompany';
import { PAGE } from '../../../lib/page-titles';

type Payment = {
  id: string;
  amount: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  invoiceId: string;
  invoiceReference: string;
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
};

export default function PaymentsPage() {
  const company = useCompany();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    apiFetch<Payment[]>(`/invoices/payments${qs ? `?${qs}` : ''}`)
      .then(setPayments)
      .catch(() => setError('No se pudieron cargar los pagos'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [method, from, to]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => p.clientName?.toLowerCase().includes(q) || p.invoiceReference?.toLowerCase().includes(q));
  }, [payments, query]);

  const total = filtered.reduce((s, p) => s + parseFloat(p.amount), 0);

  async function voidPayment(p: Payment) {
    if (!confirm(`¿Anular el abono de ${formatCurrency(p.amount)} de ${p.clientName}?`)) return;
    setVoidingId(p.id);
    try {
      await apiFetch(`/invoices/${p.invoiceId}/payments/${p.id}`, { method: 'DELETE' });
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo anular el abono');
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.payments.emoji} title={PAGE.payments.title} subtitle={PAGE.payments.subtitle} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="stat-card">
          <p className="text-xs text-slate-500">💰 Abonos</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="stat-card col-span-1 lg:col-span-1">
          <p className="text-xs text-slate-500">✅ Total cobrado</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="executive-card p-4 mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente o factura..." className="input !pl-9 text-sm" />
        </div>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="input text-sm">
          <option value="">Todos los métodos</option>
          {Object.entries(paymentMethodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm flex-1" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm flex-1" />
        </div>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-center text-slate-400 py-12">💰 Cargando pagos...</p>}
        {!loading && error && <p className="text-center text-red-600 py-8">{error}</p>}
        {!loading && !error && filtered.map((p) => (
          <article key={p.id} className="payment-card">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase">{p.clientName}</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(p.amount)}</p>
              <p className="text-sm text-slate-600 mt-1">
                {paymentMethodLabel[p.method] ?? p.method}
                {p.reference ? ` · ${p.reference}` : ''}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(p.paidAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                <Link href={`/dashboard/invoices/${p.invoiceId}`} className="text-blue-700 hover:underline">{p.invoiceReference}</Link>
              </p>
            </div>
            <div className="action-bar sm:!p-2 sm:!bg-transparent sm:!border-0 shrink-0">
              <button type="button" title="Recibo" onClick={() => printPaymentReceipt(p, company?.name, company?.logoUrl)} className="btn-subtle">
                <Receipt size={15} /> Recibo
              </button>
              <button type="button" title="WhatsApp" onClick={() => sharePaymentReceiptWhatsApp(p, company?.name)} className="btn-subtle">
                <MessageCircle size={15} />
              </button>
              <button type="button" title="Anular" disabled={voidingId === p.id} onClick={() => voidPayment(p)} className="btn-subtle btn-subtle-danger">
                <Ban size={15} />
              </button>
            </div>
          </article>
        ))}
        {!loading && !error && !filtered.length && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3" aria-hidden>💰</p>
            <p className="font-medium">Sin pagos registrados</p>
            <p className="text-sm mt-1">Los abonos aparecen aquí al registrarlos desde una factura</p>
            <Link href="/dashboard/invoices" className="btn-subtle btn-subtle-primary mt-4 inline-flex">Ir a facturas</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
