'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Receipt, MessageCircle, Ban, Search, Printer, FileDown, Wallet, CheckCircle2, Calendar } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { paymentMethodLabel } from '../../../lib/labels';
import { printPaymentReceipt, sharePaymentReceiptWhatsApp } from '../../../lib/invoice-utils';
import { exportCsv, printReportTable } from '../../../lib/report-utils';
import { useCompany } from '../../../lib/useCompany';
import { PAGE } from '../../../lib/page-titles';
import { useAppDialog } from '../../../components/AppDialogProvider';

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
  const { confirm, alert } = useAppDialog();
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
  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return filtered.filter((p) => new Date(p.paidAt).toDateString() === today)
      .reduce((s, p) => s + parseFloat(p.amount), 0);
  }, [filtered]);

  function printPayments() {
    printReportTable({
      title: 'Reporte de pagos',
      companyName: company?.name,
      subtitle: from || to ? `${from || 'Inicio'} — ${to || 'Hoy'}` : 'Todos los abonos',
      meta: [
        { label: 'Abonos', value: String(filtered.length) },
        { label: 'Total cobrado', value: formatCurrency(total) },
      ],
      columns: ['Fecha', 'Cliente', 'Factura', 'Método', 'Referencia', 'Monto'],
      rows: filtered.map((p) => [
        new Date(p.paidAt).toLocaleDateString('es-DO'),
        p.clientName,
        p.invoiceReference,
        paymentMethodLabel[p.method] ?? p.method,
        p.reference ?? '—',
        formatCurrency(p.amount),
      ]),
      totalsRow: ['', '', '', '', 'Total', formatCurrency(total)],
    });
  }

  function exportPayments() {
    exportCsv('pagos', ['Fecha', 'Cliente', 'Factura', 'Método', 'Referencia', 'Monto'],
      filtered.map((p) => [
        new Date(p.paidAt).toLocaleDateString('es-DO'),
        p.clientName,
        p.invoiceReference,
        paymentMethodLabel[p.method] ?? p.method,
        p.reference ?? '',
        parseFloat(p.amount).toFixed(2),
      ]));
  }

  async function voidPayment(p: Payment) {
    const ok = await confirm({
      title: 'Anular pago',
      message: `¿Anular el abono de ${formatCurrency(p.amount)} de ${p.clientName}?`,
      confirmLabel: 'Anular',
      variant: 'danger',
    });
    if (!ok) return;
    setVoidingId(p.id);
    try {
      await apiFetch(`/invoices/${p.invoiceId}/payments/${p.id}`, { method: 'DELETE' });
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo anular el abono', variant: 'error' });
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={PAGE.payments.title}
        subtitle={PAGE.payments.subtitle}
        action={(
          <Link href="/dashboard/invoices" className="btn-primary text-sm">
            <Wallet size={16} /> Registrar pago
          </Link>
        )}
      />

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Wallet size={14} /> Abonos</p>
            <p className="report-kpi-value text-slate-800">{filtered.length}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> Total cobrado</p>
            <p className="report-kpi-value text-emerald-700">{formatCurrency(total)}</p>
          </div>
          <div className="report-kpi col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Calendar size={14} /> Cobrado hoy</p>
            <p className="report-kpi-value text-blue-700">{formatCurrency(todayTotal)}</p>
          </div>
        </div>
      )}

      <div className="executive-card p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente o factura..." className="input !pl-9 text-sm" />
          </div>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input text-sm sm:max-w-[180px]">
            <option value="">Todos los métodos</option>
            {Object.entries(paymentMethodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm flex-1 min-w-[130px]" />
          <span className="text-slate-400 text-sm">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm flex-1 min-w-[130px]" />
          <button type="button" onClick={exportPayments} disabled={!filtered.length} className="report-toolbar-btn disabled:opacity-40">
            <FileDown size={14} /> CSV
          </button>
          <button type="button" onClick={printPayments} disabled={!filtered.length} className="report-toolbar-btn disabled:opacity-40">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Cargando pagos..." />}
      {!loading && error && <p className="text-center text-red-600 py-8 executive-card">{error}</p>}

      <div className="space-y-3">
        {!loading && !error && filtered.map((p) => (
          <article key={p.id} className="executive-card flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{p.clientName}</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5 tabular-nums">{formatCurrency(p.amount)}</p>
              <p className="text-sm text-slate-600 mt-1">
                {paymentMethodLabel[p.method] ?? p.method}
                {p.reference ? ` · ${p.reference}` : ''}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(p.paidAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · '}
                <Link href={`/dashboard/invoices/${p.invoiceId}`} className="text-blue-700 font-semibold hover:underline">{p.invoiceReference}</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button type="button" title="Recibo" onClick={() => printPaymentReceipt(p, company?.name, company?.logoUrl)} className="action-chip">
                <Receipt size={15} /> <span className="!inline">Recibo</span>
              </button>
              <button type="button" title="WhatsApp" onClick={() => sharePaymentReceiptWhatsApp(p, company?.name)} className="action-chip action-chip-whatsapp">
                <MessageCircle size={15} />
              </button>
              <button type="button" title="Anular" disabled={voidingId === p.id} onClick={() => voidPayment(p)} className="action-chip !text-red-600 !border-red-200 hover:!bg-red-50 disabled:opacity-50">
                <Ban size={15} />
              </button>
            </div>
          </article>
        ))}
        {!loading && !error && !filtered.length && (
          <EmptyState
            icon={Wallet}
            title="Sin pagos registrados"
            subtitle="Los abonos aparecen al registrarlos desde una factura"
            action={{ href: '/dashboard/invoices', label: 'Ir a facturas' }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
