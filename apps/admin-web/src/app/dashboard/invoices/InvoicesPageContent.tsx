'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, FileText, AlertCircle, Wallet, Plus, TrendingUp, FileDown, CalendarRange, ArrowUpDown } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { InvoiceCard } from '../../../components/InvoiceCard';
import { EmptyState } from '../../../components/EmptyState';
import { ListPageSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/ToastProvider';
import { apiFetch } from '../../../lib/api';
import { PAGE } from '../../../lib/page-titles';
import { InvoiceListItem, invoiceBalance, formatUsd } from '../../../lib/invoice-utils';
import { formatCurrency } from '../../../lib/currency';
import { exportCsv } from '../../../lib/report-utils';
import { invoiceStatusText } from '../../../lib/labels';

type StatusFilter = 'all' | 'open' | 'overdue' | 'paid';
type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'balance_desc';

const SORT_LABELS: Record<SortOption, string> = {
  date_desc: 'Más recientes',
  date_asc: 'Más antiguas',
  amount_desc: 'Mayor monto',
  balance_desc: 'Mayor saldo',
};

export default function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') === 'overdue' ? 'overdue' : searchParams.get('filter') === 'open' ? 'open' : 'all') as StatusFilter;
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDates, setShowDates] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch<InvoiceListItem[]>('/invoices')
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    const list = invoices.filter((inv) => {
      const balance = invoiceBalance(inv);
      if (statusFilter === 'open' && !(balance > 0 && ['issued', 'partially_paid', 'overdue'].includes(inv.status ?? ''))) return false;
      if (statusFilter === 'overdue' && inv.status !== 'overdue') return false;
      if (statusFilter === 'paid' && balance > 0.01) return false;
      if (fromTs || toTs) {
        const issued = inv.issuedAt ? new Date(inv.issuedAt).getTime() : null;
        if (issued === null) return false;
        if (fromTs && issued < fromTs) return false;
        if (toTs && issued > toTs) return false;
      }
      if (!q) return true;
      return inv.reference?.toLowerCase().includes(q)
        || inv.ncf?.toLowerCase().includes(q)
        || inv.clientName?.toLowerCase().includes(q);
    });

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.issuedAt ?? 0).getTime() - new Date(b.issuedAt ?? 0).getTime();
        case 'amount_desc':
          return parseFloat(b.totalAmount || '0') - parseFloat(a.totalAmount || '0');
        case 'balance_desc':
          return invoiceBalance(b) - invoiceBalance(a);
        default:
          return new Date(b.issuedAt ?? 0).getTime() - new Date(a.issuedAt ?? 0).getTime();
      }
    });
  }, [invoices, query, statusFilter, sortBy, dateFrom, dateTo]);

  function exportInvoicesCsv() {
    exportCsv(
      'facturas',
      ['Referencia', 'NCF', 'Cliente', 'Estado', 'Emitida', 'Total', 'Pagado', 'Saldo'],
      filtered.map((inv) => [
        inv.reference ?? '',
        inv.ncf ?? '',
        inv.clientName ?? '',
        inv.status ? invoiceStatusText(inv.status) : '',
        inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('es-DO') : '',
        parseFloat(inv.totalAmount || '0').toFixed(2),
        parseFloat(inv.paidAmount || '0').toFixed(2),
        invoiceBalance(inv).toFixed(2),
      ]),
    );
    showToast(`CSV exportado (${filtered.length} facturas)`);
  }

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
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><TrendingUp size={14} /> Facturado</p>
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
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={() => setShowDates((v) => !v)}
            className={`report-toolbar-btn ${showDates || dateFrom || dateTo ? '!border-blue-400 !text-blue-700 !bg-blue-50' : ''}`}
          >
            <CalendarRange size={14} /> Fechas
          </button>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="report-toolbar-btn appearance-none !pr-8 cursor-pointer"
              aria-label="Ordenar facturas"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ArrowUpDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={exportInvoicesCsv}
            disabled={!filtered.length}
            className="report-toolbar-btn disabled:opacity-40"
          >
            <FileDown size={14} /> CSV
          </button>
        </div>

        {showDates && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              Desde
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input !w-auto !py-1.5 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              Hasta
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input !w-auto !py-1.5 text-sm" />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {loading && <ListPageSkeleton />}

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
          <EmptyState
            icon={FileText}
            title="Sin facturas"
            subtitle="Cree una nueva factura para comenzar"
            action={{ href: '/dashboard/invoices/new', label: 'Nueva factura' }}
          />
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
