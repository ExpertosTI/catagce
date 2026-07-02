'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../lib/currency';
import { presaleStatusLabel } from '../../../lib/labels';

export default function PresalesPage() {
  const [presales, setPresales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/catalogs/presales')
      .then(setPresales)
      .catch(() => setError('No se pudieron cargar las preventas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Preventas" subtitle="Pedidos de clientes desde catálogos" />
      <div className="card overflow-hidden">
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
            {loading && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Cargando...</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={4} className="p-8 text-center text-red-600">{error}</td></tr>
            )}
            {!loading && !error && presales.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td className="p-4 font-medium">{p.reference}</td>
                <td className="p-4">{p.clientName}</td>
                <td className="p-4"><span className="badge-blue">{presaleStatusLabel[p.status] ?? p.status}</span></td>
                <td className="p-4 text-right font-medium">{formatCurrency(p.totalAmount)}</td>
              </tr>
            ))}
            {!loading && !error && !presales.length && (
              <tr><td colSpan={4} className="p-10 text-center text-slate-500">Aún no hay preventas registradas. Se crean desde el catálogo público que comparta con sus clientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
