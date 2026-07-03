'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Truck, Package, ChevronRight, Wallet } from 'lucide-react';
import PortalLayout from '../../components/PortalLayout';
import { LoadingState } from '../../components/LoadingState';
import { apiFetch } from '../../lib/api';
import { formatUsd, InvoiceListItem, invoiceBalance } from '../../lib/invoice-utils';

export default function PortalHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ invoices: 0, balance: 0, pendingUnits: 0, dispatches: 0 });

  useEffect(() => {
    Promise.all([
      apiFetch<InvoiceListItem[]>('/portal/invoices').catch((): InvoiceListItem[] => []),
      apiFetch<Array<{ pendingQty: number }>>('/portal/pending-merchandise').catch((): Array<{ pendingQty: number }> => []),
      apiFetch<unknown[]>('/portal/dispatches').catch((): unknown[] => []),
    ])
      .then(([invoices, pending, dispatches]) => {
        const balance = invoices.reduce<number>((sum, inv) => sum + invoiceBalance(inv), 0);
        const pendingUnits = pending.reduce<number>((sum, item) => sum + (item.pendingQty ?? 0), 0);
        setStats({
          invoices: invoices.length,
          balance,
          pendingUnits,
          dispatches: dispatches.length,
        });
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const quickLinks = [
    { href: '/portal/invoices', label: 'Mis facturas', desc: 'Consultar y pagar', icon: FileText, color: 'text-blue-600' },
    { href: '/portal/pending', label: 'Mercancía pendiente', desc: 'Por despachar', icon: Package, color: 'text-amber-600' },
    { href: '/portal/dispatches', label: 'Mis despachos', desc: 'Historial de entregas', icon: Truck, color: 'text-emerald-600' },
  ];

  return (
    <PortalLayout>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Mi cuenta</h2>
        <p className="text-slate-500 text-sm mt-1">Resumen de su actividad con nosotros</p>
      </div>

      {loading ? (
        <LoadingState message="Cargando resumen..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><FileText size={14} /> Facturas</p>
              <p className="report-kpi-value text-slate-800">{stats.invoices}</p>
            </div>
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Wallet size={14} /> Saldo pendiente</p>
              <p className={`report-kpi-value ${stats.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatUsd(stats.balance)}
              </p>
            </div>
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Por despachar</p>
              <p className="report-kpi-value text-amber-600">{stats.pendingUnits}</p>
            </div>
            <div className="report-kpi">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Truck size={14} /> Despachos</p>
              <p className="report-kpi-value text-emerald-700">{stats.dispatches}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {quickLinks.map(({ href, label, desc, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="executive-card flex items-center gap-3 group hover:shadow-md transition-all hover:-translate-y-px"
              >
                <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 shrink-0 transition" />
              </Link>
            ))}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
