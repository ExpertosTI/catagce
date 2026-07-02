'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../components/DashboardLayout';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch('/dashboard/summary').then(setData).catch(() => window.location.href = '/login');
  }, []);

  const cards = [
    { label: 'Facturas emitidas', value: data?.invoices?.total ?? '—', color: 'text-blue-700' },
    { label: 'Cuentas por cobrar', value: data ? formatCurrency(data.invoices?.creditPending || '0') : '—', color: 'text-amber-700' },
    { label: 'Despachos pendientes', value: data?.pendingDispatch?.count ?? '—', color: 'text-orange-700' },
    { label: 'Unidades por despachar', value: data?.pendingDispatch?.units ?? '—', color: 'text-orange-700' },
    { label: 'Mercancía en almacén', value: data?.stock?.inWarehouse ?? '—', color: 'text-emerald-700' },
    { label: 'Clientes activos', value: data?.activeClients ?? '—', color: 'text-blue-700' },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Panel" subtitle="Resumen operativo de importación" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
