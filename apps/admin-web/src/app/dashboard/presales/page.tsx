'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function PresalesPage() {
  const [presales, setPresales] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/catalogs/presales').then(setPresales).catch(console.error);
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
            {presales.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="p-4 font-medium">{p.reference}</td>
                <td className="p-4">{p.clientName}</td>
                <td className="p-4"><span className="badge-blue capitalize">{p.status}</span></td>
                <td className="p-4 text-right font-medium">${parseFloat(p.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
