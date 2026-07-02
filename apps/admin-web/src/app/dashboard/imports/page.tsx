'use client';

import { useEffect, useState } from 'react';
import { Ship, PackageCheck } from 'lucide-react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';
import { importStatusLabel } from '../../../lib/labels';

type ImportShipment = {
  id: string;
  reference: string;
  containerNumber?: string;
  status: string;
  etaDate?: string;
  receivedAt?: string;
  supplierName?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportShipment[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<ImportShipment[]>('/imports').then(setImports).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function receive(id: string) {
    if (!confirm('¿Confirmar recepción en almacén? Esto sumará las cantidades al inventario.')) return;
    await apiFetch(`/imports/${id}/receive`, { method: 'PATCH' });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Importaciones"
        subtitle="Contenedores y recepción de mercancía"
        action={<ActionButton href="/dashboard/imports/new" label="Nueva importación" />}
      />

      {loading && <p className="text-center text-slate-500 py-12">Cargando importaciones...</p>}

      {!loading && imports.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Ship className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium">Sin importaciones registradas</p>
          <p className="text-sm mt-1">Registre un contenedor en camino</p>
        </div>
      )}

      <div className="space-y-3">
        {imports.map((imp) => (
          <div key={imp.id} className="invoice-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Ship size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{imp.reference}</p>
                <p className="text-sm text-slate-500 truncate">
                  {imp.supplierName ? `${imp.supplierName} · ` : ''}Contenedor: {imp.containerNumber || '—'}
                </p>
                <p className="text-xs text-slate-400">
                  {imp.status === 'received' ? `Recibido: ${formatDate(imp.receivedAt)}` : `ETA: ${formatDate(imp.etaDate)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={imp.status === 'received' ? 'badge-green' : 'badge-amber'}>
                {importStatusLabel[imp.status] ?? imp.status}
              </span>
              {imp.status !== 'received' && (
                <button type="button" onClick={() => receive(imp.id)} className="btn-action btn-action-primary">
                  <PackageCheck size={15} /> Recibir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
