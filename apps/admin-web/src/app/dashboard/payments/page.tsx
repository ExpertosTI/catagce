'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Receipt, MessageCircle, Ban } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { paymentMethodLabel } from '../../../lib/labels';
import { printPaymentReceipt, sharePaymentReceiptWhatsApp } from '../../../lib/invoice-utils';
import { useCompany } from '../../../lib/useCompany';

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
    if (!confirm(`¿Anular el abono de ${formatCurrency(p.amount)} de ${p.clientName}? Esta acción no se puede deshacer.`)) return;
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
      <PageHeader title="Pagos" subtitle="Historial de abonos recibidos en todas las facturas" />

      <div className="card p-4 mb-4 grid gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente o factura..."
            className="input !pl-9 text-sm"
          />
        </div>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="input text-sm">
          <option value="">Todos los métodos</option>
          {Object.entries(paymentMethodLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm flex-1" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm flex-1" />
        </div>
      </div>

      {!loading && !error && (
        <div className="card p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{filtered.length} abono{filtered.length !== 1 ? 's' : ''}</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(total)}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Fecha</th>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Factura</th>
              <th className="text-left p-4">Método</th>
              <th className="text-right p-4">Monto</th>
              <th className="text-right p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>}
            {!loading && error && <tr><td colSpan={6} className="p-8 text-center text-red-600">{error}</td></tr>}
            {!loading && !error && filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td className="p-4 whitespace-nowrap">{new Date(p.paidAt).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td className="p-4">{p.clientName}</td>
                <td className="p-4">
                  <Link href={`/dashboard/invoices/${p.invoiceId}`} className="text-blue-700 font-medium hover:underline">{p.invoiceReference}</Link>
                </td>
                <td className="p-4">{paymentMethodLabel[p.method] ?? p.method}{p.reference ? ` (${p.reference})` : ''}</td>
                <td className="p-4 text-right font-semibold text-emerald-700">{formatCurrency(p.amount)}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button" title="Imprimir recibo"
                      onClick={() => printPaymentReceipt(p, company?.name, company?.logoUrl)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    >
                      <Receipt size={15} />
                    </button>
                    <button
                      type="button" title="Enviar por WhatsApp"
                      onClick={() => sharePaymentReceiptWhatsApp(p, company?.name)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <MessageCircle size={15} />
                    </button>
                    <button
                      type="button" title="Anular abono" disabled={voidingId === p.id}
                      onClick={() => voidPayment(p)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Ban size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && !filtered.length && (
              <tr><td colSpan={6} className="p-10 text-center text-slate-500">No hay pagos que coincidan con los filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
