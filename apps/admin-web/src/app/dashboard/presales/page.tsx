'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, SectionTitle } from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState } from '../../../components/EmptyState';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { presaleStatusLabel } from '../../../lib/labels';
import { PAGE } from '../../../lib/page-titles';

type Presale = {
  id: string;
  reference: string;
  clientName: string;
  status: string;
  totalAmount: string;
};

export default function PresalesPage() {
  const [presales, setPresales] = useState<Presale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Presale[]>('/catalogs/presales')
      .then(setPresales)
      .catch(() => setError('No se pudieron cargar las preventas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.presales.emoji} title={PAGE.presales.title} subtitle={PAGE.presales.subtitle} />

      {loading && <LoadingState emoji="🛒" message="Cargando preventas..." />}
      {!loading && error && (
        <div className="executive-card p-8 text-center text-red-600">❌ {error}</div>
      )}

      {!loading && !error && presales.length === 0 && (
        <EmptyState
          emoji="🛒"
          title="Sin preventas"
          subtitle="Se crean cuando los clientes piden desde el catálogo público"
        />
      )}

      {!loading && !error && presales.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:hidden mb-4">
            {presales.map((p) => (
              <article key={p.id} className="executive-card">
                <div className="flex justify-between gap-2 mb-2">
                  <p className="font-bold text-slate-900">{p.reference}</p>
                  <span className="badge-blue shrink-0">{presaleStatusLabel[p.status] ?? p.status}</span>
                </div>
                <p className="text-sm text-slate-600">👤 {p.clientName}</p>
                <p className="text-lg font-bold text-blue-700 mt-2">{formatCurrency(p.totalAmount)}</p>
              </article>
            ))}
          </div>

          <SectionTitle emoji="🛒">Listado de preventas</SectionTitle>
          <div className="executive-card overflow-hidden !p-0 hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="text-left p-4">Referencia</th>
                  <th className="text-left p-4">Cliente</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-right p-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {presales.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="p-4 font-medium">{p.reference}</td>
                    <td className="p-4">{p.clientName}</td>
                    <td className="p-4"><span className="badge-blue">{presaleStatusLabel[p.status] ?? p.status}</span></td>
                    <td className="p-4 text-right font-medium">{formatCurrency(p.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
