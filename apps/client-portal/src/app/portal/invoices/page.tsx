'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import PortalLayout from '../../../components/PortalLayout';
import { InvoiceCard } from '../../../components/InvoiceCard';
import { apiFetch } from '../../../lib/api';
import { formatUsd, InvoiceListItem, invoiceBalance } from '../../../lib/invoice-utils';

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<InvoiceListItem[]>('/portal/invoices')
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      inv.reference?.toLowerCase().includes(q)
      || inv.clientName?.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const total = filtered.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const balance = filtered.reduce((s, i) => s + invoiceBalance(i), 0);

  return (
    <PortalLayout>
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Facturas</h2>
        <p className="text-slate-500 text-sm mt-1">Consulte, comparta y descargue en PDF</p>
      </div>

      <div className="relative max-w-xl mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-search"
          placeholder="Buscar por referencia..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading && <p className="text-center text-slate-500 py-12">Cargando facturas...</p>}
        {!loading && filtered.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            detailPath={`/portal/invoices/${inv.id}`}
            fetchPath={`/portal/invoices/${inv.id}`}
          />
        ))}
        {!loading && !filtered.length && (
          <p className="text-center text-slate-500 py-12">Sin facturas</p>
        )}
      </div>

      {filtered.length > 0 && (
        <footer className="invoice-summary-footer mt-8">
          <span className="summary-pill">Facturas: {filtered.length}</span>
          <div className="flex justify-between font-semibold text-sm mt-3">
            <span>Total facturado</span>
            <span>{formatUsd(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-red-600 text-sm mt-1">
            <span>Balance pendiente</span>
            <span>{formatUsd(balance)}</span>
          </div>
        </footer>
      )}
    </PortalLayout>
  );
}
