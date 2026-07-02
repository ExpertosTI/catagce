'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Wallet, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { InvoiceListItem, invoiceBalance, formatUsd } from '../lib/invoice-utils';
import { invoiceStatusText } from '../lib/labels';

type Props = {
  clientId: string;
  clientName: string;
  expanded: boolean;
};

export function ClientInvoicePanel({ clientId, clientName, expanded }: Props) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    apiFetch<InvoiceListItem[]>(`/invoices?clientId=${clientId}`)
      .then((data) => {
        setInvoices(data);
        setLoaded(true);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [expanded, clientId]);

  if (!expanded) return null;

  const totalPending = invoices.reduce((s, i) => s + invoiceBalance(i), 0);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-700">
          🧾 Facturas de {clientName}
          {totalPending > 0 && (
            <span className="ml-2 text-red-600">· Pendiente {formatUsd(totalPending)}</span>
          )}
        </p>
        <Link href={`/dashboard/invoices/new?clientId=${clientId}`} className="action-chip action-chip-success text-xs">
          <Plus size={14} /> <span className="!inline">Nueva factura</span>
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-slate-400 flex items-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin" /> Cargando facturas...
        </p>
      )}

      {!loading && loaded && invoices.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Sin facturas — emita la primera para este cliente
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const balance = invoiceBalance(inv);
            return (
              <div key={inv.id} className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{inv.ncf ?? inv.reference}</p>
                    <p className="text-xs text-slate-500">
                      {invoiceStatusText(inv.status)} · Total {formatUsd(inv.totalAmount)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Saldo</p>
                    <p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatUsd(balance)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {balance > 0 && (
                    <Link
                      href={`/dashboard/invoices/${inv.id}?abono=1`}
                      className="btn-primary !py-2 !px-4 text-sm flex-1 sm:flex-none justify-center min-w-[120px]"
                    >
                      <Wallet size={16} /> Pagar {formatUsd(balance)}
                    </Link>
                  )}
                  <Link href={`/dashboard/invoices/${inv.id}`} className="action-chip text-xs flex-1 sm:flex-none justify-center">
                    <span className="!inline">Ver detalle</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invoices.length > 0 && (
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="block text-center text-xs text-blue-700 font-medium mt-3 hover:underline"
        >
          Ver perfil completo del cliente →
        </Link>
      )}
    </div>
  );
}
