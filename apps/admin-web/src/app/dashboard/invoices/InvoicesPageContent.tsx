'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, FileText, AlertCircle, Wallet, Plus } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { InvoiceCard } from '../../../components/InvoiceCard';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { PAGE } from '../../../lib/page-titles';
import { InvoiceListItem, invoiceBalance, formatUsd } from '../../../lib/invoice-utils';
import { formatCurrency } from '../../../lib/currency';

type StatusFilter = 'all' | 'open' | 'overdue' | 'paid';

export default function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') === 'overdue' ? 'overdue' : searchParams.get('filter') === 'open' ? 'open' : 'all') as StatusFilter;
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<InvoiceListItem[]>('/invoices')
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const balance = invoiceBalance(inv);
      if (statusFilter === 'open' && !(balance > 0 && ['issued', 'partially_paid', 'overdue'].includes(inv.status ?? ''))) return false;
      if (statusFilter === 'overdue' && inv.status !== 'overdue') return false;
      if (statusFilter === 'paid' && balance > 0.01) return false;
      if (!q) return true;
      return inv.reference?.toLowerCase().includes(q)
        || inv.ncf?.toLowerCase().includes(q)
        || inv.clientName?.toLowerCase().includes(q);
    });
  }, [invoices, query, statusFilter]);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
    const balance = invoices.reduce((s, i) => s + invoiceBalance(i), 0);
    const overdue = invoices.filter((i) => i.status === 'overdue').length;
    const open = invoices.filter((i) => invoiceBalance(i) > 0).length;
    return { total, balance, overdue, open, count: invoices.length };
  }, [invoices]);

  const filteredTotal = filtered.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const filteredBalance = filtered.reduce((s, i) => s + invoiceBalance(i), 0);

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.invoices.emoji}
        title={PAGE.invoices.title}
        subtitle={PAGE.invoices.subtitle}
        action={(
          <Link href="/dashboard/invoices/new" className="btn-primary text-sm">
            <Plus size={16} /> Nueva factura
          </Link>
        )}
      />

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><FileText size={14} /> Facturas</p>
            <p className="report-kpi-value text-slate-800">{stats.count}</p>
            <p className="text-[11px] text-slate-400">{stats.open} con saldo</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium">📈 Facturado</p>
            <p className="report-kpi-value text-blue-700 text-lg">{formatCurrency(stats.total)}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Wallet size={14} /> Por cobrar</p>
            <p className="report-kpi-value text-red-600 text-lg">{formatCurrency(stats.balance)}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><AlertCircle size={14} /> Vencidas</p>
            <p className={`report-kpi-value ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-600'}`}>{stats.overdue}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-search"
            placeholder="Buscar por NCF, referencia o cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="report-tabs !mb-0 overflow-x-auto">
          {([
            ['all', 'Todas'],
            ['open', 'Con saldo'],
            ['overdue', 'Vencidas'],
            ['paid', 'Pagadas'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`report-tab ${statusFilter === id ? 'report-tab-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState emoji="🧾" message="Cargando facturas..." />}

      <div className="space-y-3">
        {!loading && filtered.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            detailPath={`/dashboard/invoices/${inv.id}`}
            fetchPath={`/invoices/${inv.id}`}
          />
        ))}
        {!loading && !filtered.length && (
          <div className="executive-card text-center py-16 text-slate-500">
            <p className="text-4xl mb-3" aria-hidden>🧾</p>
            <p className="font-semibold text-slate-700">Sin facturas</p>
            <p className="text-sm mt-1">Cree una nueva factura para comenzar</p>
            <Link href="/dashboard/invoices/new" className="btn-primary text-sm mt-4 inline-flex">Nueva factura</Link>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <footer className="grid sm:grid-cols-2 gap-3 mt-8">
          <div className="report-kpi">
            <p className="text-xs text-slate-500">Total filtrado ({filtered.length})</p>
            <p className="report-kpi-value text-blue-700">{formatUsd(filteredTotal)}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="report-kpi-value text-red-600">{formatUsd(filteredBalance)}</p>
          </div>
        </footer>
      )}
    </DashboardLayout>
  );
}
