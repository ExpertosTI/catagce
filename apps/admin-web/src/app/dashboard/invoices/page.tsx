'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

function formatUsd(n: number) {
  return `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch('/invoices').then(setInvoices).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      inv.reference?.toLowerCase().includes(q)
      || inv.clientName?.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const total = filtered.reduce((s: number, i: any) => s + parseFloat(i.totalAmount || '0'), 0);
  const balance = filtered.reduce(
    (s: number, i: any) => s + Math.max(0, parseFloat(i.totalAmount || '0') - parseFloat(i.paidAmount || '0')),
    0,
  );

  return (
    <DashboardLayout>
      <PageHeader title="Facturas" subtitle="Vista simple" action={<ActionButton href="/dashboard/invoices/new" label="Nueva factura" />} />

      <input
        className="w-full max-w-xl border border-slate-200 rounded-full px-4 py-2.5 text-sm mb-4"
        placeholder="Buscar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.map((inv) => {
          const bruto = parseFloat(inv.subtotal || inv.totalAmount || '0');
          const itbis = parseFloat(inv.taxAmount || '0');
          const totalAmt = parseFloat(inv.totalAmount || '0');
          return (
            <div key={inv.id} className="bg-white border border-slate-200 rounded p-3 flex flex-col sm:flex-row gap-3 sm:items-start">
              <div className="flex-1 min-w-0">
                <p className="text-green-600 font-bold text-xs uppercase truncate">{inv.clientName}</p>
                <p className="text-blue-600 font-bold text-sm">{inv.reference}</p>
                <p className="text-xs text-slate-800">{inv.invoiceType === 'credit' ? 'FACTURA DE CRÉDITO FISCAL' : 'FACTURA'}</p>
                <p className="text-xs text-slate-800">{inv.issuedAt ? formatDate(inv.issuedAt) : '—'}</p>
              </div>
              <div className="text-xs text-slate-800 shrink-0">
                <p>Bruto: {formatUsd(bruto)}</p>
                <p>ITBIS: {formatUsd(itbis)}</p>
                <p>Total: {formatUsd(totalAmt)}</p>
              </div>
              <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 sm:gap-0 shrink-0 w-full sm:w-auto">
                <p className="text-red-600 font-extrabold text-sm">{formatUsd(totalAmt)}</p>
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="text-center text-slate-500 py-12">Sin facturas</p>}
      </div>

      {filtered.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4 text-sm max-w-xl">
          <p className="text-center text-slate-500 mb-2">Facturas totales: {filtered.length}</p>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatUsd(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-red-600 mt-1">
            <span>Balance:</span>
            <span>{formatUsd(balance)}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
