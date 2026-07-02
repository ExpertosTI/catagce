'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function ImportsPage() {
  const [imports, setImports] = useState<any[]>([]);

  function load() {
    apiFetch('/imports').then(setImports).catch(console.error);
  }

  useEffect(() => { load(); }, []);

  async function receive(id: string) {
    await apiFetch(`/imports/${id}/receive`, { method: 'PATCH' });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader title="Importaciones" subtitle="Contenedores y recepción de mercancía" />
      <div className="space-y-3">
        {imports.map((imp) => (
          <div key={imp.id} className="card p-5 flex justify-between items-center">
            <div>
              <p className="font-bold">{imp.reference}</p>
              <p className="text-sm text-slate-500">Contenedor: {imp.containerNumber || '—'}</p>
              <span className={`mt-2 inline-block capitalize ${imp.status === 'received' ? 'badge-green' : 'badge-amber'}`}>{imp.status}</span>
            </div>
            {imp.status !== 'received' && (
              <button onClick={() => receive(imp.id)} className="btn-primary text-sm">Recibir en almacén</button>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
