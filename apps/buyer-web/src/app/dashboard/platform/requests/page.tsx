'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlatformNav } from '@/components/PlatformNav';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type RequestRow = {
  id: string;
  sellerId: string;
  fromPlan: string;
  toPlan: string;
  status: string;
  paymentNote?: string;
  paymentMethod?: string;
  amountClaimed?: string;
  adminNote?: string;
  createdAt: string;
  sellerName: string;
  sellerSlug: string;
  sellerEmail?: string;
  sellerPhone?: string;
  currentPlan: string;
};

export default function PlatformRequestsPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const { isPlatformAdmin, loading: meLoading } = useMe();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    const qs = filter === 'pending' ? '?status=pending' : '';
    apiFetch<RequestRow[]>(`/platform/plan-requests${qs}`)
      .then(setRows)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      });
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    load();
  }, [ensureAuth, filter]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    const adminNote =
      action === 'reject' ? window.prompt('Motivo (opcional):') || undefined : undefined;
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/platform/plan-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, adminNote }),
      });
      setMsg(action === 'approve' ? 'Plan aprobado y asignado' : 'Solicitud rechazada');
      setTimeout(() => setMsg(''), 2500);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo revisar'));
    } finally {
      setBusy(null);
    }
  };

  if (meLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      </DashboardLayout>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-red-400">Sin acceso de platform admin</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PlatformNav active="/dashboard/platform/requests" />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">Solicitudes de plan / pago</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg ${filter === 'pending' ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-gray-400'}`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-gray-400'}`}
          >
            Todas
          </button>
        </div>
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.sellerName}</p>
                <p className="text-xs text-gray-500">
                  {r.sellerSlug} · {r.sellerEmail || 'sin email'} · {r.sellerPhone || 'sin tel'}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  r.status === 'pending'
                    ? 'bg-[#FF8A00]/20 text-[#FF8A00]'
                    : r.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="text-sm">
              <span className="text-gray-400">{r.fromPlan}</span>
              <span className="mx-2 text-[#00D1FF]">→</span>
              <span className="font-bold text-[#00D1FF]">{r.toPlan}</span>
              <span className="text-gray-500 text-xs ml-2">(actual: {r.currentPlan})</span>
            </p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-gray-500">Método:</span> {r.paymentMethod || '—'}
                {r.amountClaimed ? ` · ${r.amountClaimed}` : ''}
              </p>
              <p>
                <span className="text-gray-500">Nota / ref. pago:</span> {r.paymentNote || '—'}
              </p>
              <p className="text-xs text-gray-600">
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
              </p>
            </div>
            {r.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => review(r.id, 'approve')}
                  className="px-4 py-2 rounded-xl bg-[#25D366] text-black text-sm font-bold disabled:opacity-50"
                >
                  Aprobar y subir plan
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => review(r.id, 'reject')}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
        {!rows.length && (
          <p className="text-gray-500 text-sm">
            {filter === 'pending' ? 'No hay solicitudes pendientes' : 'Sin solicitudes'}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
