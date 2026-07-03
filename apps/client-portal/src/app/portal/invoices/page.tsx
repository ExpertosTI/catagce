'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, FileText, Wallet, AlertCircle } from 'lucide-react';
import PortalLayout from '../../../components/PortalLayout';
import { InvoiceCard } from '../../../components/InvoiceCard';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { formatUsd, InvoiceListItem, invoiceBalance } from '../../../lib/invoice-utils';
import { PORTAL_PAGE } from '../../../lib/page-titles';

type Filter = 'all' | 'open' | 'paid';

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<InvoiceListItem[]>('/portal/invoices')
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const balance = invoiceBalance(inv);
      if (filter === 'open' && balance <= 0) return false;
      if (filter === 'paid' && balance > 0) return false;
      if (!q) return true;
      return inv.reference?.toLowerCase().includes(q) || inv.clientName?.toLowerCase().includes(q);
    });
  }, [invoices, query, filter]);

  const stats = useMemo(() => ({
    total: invoices.length,
    balance: invoices.reduce((sum, i) => sum + invoiceBalance(i), 0),
    open: invoices.filter((i) => invoiceBalance(i) > 0).length,
  }), [invoices]);

  const total = filtered.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
  const balance = filtered.reduce((sum, i) => sum + invoiceBalance(i), 0);

  return (
    <PortalLayout>
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{PORTAL_PAGE.invoices.title}</h2>
        <p className="text-slate-500 text-sm mt-1">{PORTAL_PAGE.invoices.subtitle}</p>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><FileText size={14} /> Facturas</p>
            <p className="report-kpi-value text-slate-800">{stats.total}</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><AlertCircle size={14} /> Con saldo</p>
            <p className="report-kpi-value text-amber-600">{stats.open}</p>
          </div>
          <div className="report-kpi border-red-200/80 bg-gradient-to-br from-red-50/50 to-white">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1"><Wallet size={14} /> Pendiente</p>
            <p className="report-kpi-value text-red-600">{formatUsd(stats.balance)}</p>
          </div>
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-search"
              placeholder="Buscar por referencia..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="segmented-control shrink-0 !w-auto">
            {([['all', 'Todas'], ['open', 'Con saldo'], ['paid', 'Pagadas']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`segmented-option px-4 ${filter === id ? 'segmented-option-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <LoadingState message="Cargando facturas..." />}
        {!loading && filtered.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            detailPath={`/portal/invoices/${inv.id}`}
            fetchPath={`/portal/invoices/${inv.id}`}
          />
        ))}
        {!loading && invoices.length > 0 && !filtered.length && (
          <div className="executive-card p-10 text-center text-slate-500">Sin resultados para este filtro</div>
        )}
        {!loading && !invoices.length && (
          <div className="executive-card p-10 text-center text-slate-500">Sin facturas registradas</div>
        )}
      </div>

      {filtered.length > 0 && (
        <footer className="invoice-summary-footer mt-8">
          <span className="summary-pill">{filtered.length} factura{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex justify-between font-semibold text-sm mt-3">
            <span>Total facturado</span>
            <span className="tabular-nums">{formatUsd(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-red-600 text-sm mt-1">
            <span>Balance pendiente</span>
            <span className="tabular-nums">{formatUsd(balance)}</span>
          </div>
        </footer>
      )}
    </PortalLayout>
  );
}
