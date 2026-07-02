'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../components/DashboardLayout';
import { LoadingState } from '../../components/LoadingState';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { DASHBOARD_STATS, PAGE } from '../../lib/page-titles';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/dashboard/summary')
      .then(setData)
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  const values: Record<string, { value: string; color: string }> = {
    invoices: { value: data?.invoices?.total ?? '—', color: 'text-blue-700' },
    credit: { value: data ? formatCurrency(data.invoices?.creditPending || '0') : '—', color: 'text-amber-700' },
    dispatchCount: { value: data?.pendingDispatch?.count ?? '—', color: 'text-orange-700' },
    dispatchUnits: { value: data?.pendingDispatch?.units ?? '—', color: 'text-orange-700' },
    stock: { value: data?.stock?.inWarehouse ?? '—', color: 'text-emerald-700' },
    clients: { value: data?.activeClients ?? '—', color: 'text-blue-700' },
  };

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.dashboard.emoji} title={PAGE.dashboard.title} subtitle={PAGE.dashboard.subtitle} />
      {loading ? (
        <LoadingState emoji="🏠" message="Cargando resumen..." />
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {DASHBOARD_STATS.map((card) => (
          <div key={card.key} className="stat-card group">
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <span aria-hidden>{card.emoji}</span> {card.label}
            </p>
            <p className={`text-2xl sm:text-3xl font-bold mt-2 ${values[card.key].color}`}>{values[card.key].value}</p>
          </div>
        ))}
      </div>
      )}
    </DashboardLayout>
  );
}
