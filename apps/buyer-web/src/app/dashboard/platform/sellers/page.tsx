'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type SellerRow = {
  id: string;
  name: string;
  slug: string;
  email?: string;
  planCode: string;
  isActive?: boolean;
};

const PLAN_CODES = [
  { code: 'free', label: 'Free' },
  { code: 'pro', label: 'Pro ($6)' },
  { code: 'business', label: 'Enterprise ($25)' },
];

export default function PlatformSellersPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const { isPlatformAdmin, loading: meLoading } = useMe();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    apiFetch<SellerRow[]>('/platform/sellers')
      .then(setSellers)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      });
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    load();
  }, [ensureAuth]);

  const assign = async (id: string, planCode: string) => {
    setError('');
    try {
      await apiFetch(`/platform/sellers/${id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ planCode }),
      });
      setMsg('Plan asignado');
      setTimeout(() => setMsg(''), 2000);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo asignar'));
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
      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <Link href="/dashboard/platform/plans" className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300">Planes</Link>
        <Link href="/dashboard/platform/sellers" className="px-3 py-1.5 rounded-lg bg-[#00D1FF]/20 text-[#00D1FF]">Sellers</Link>
        <Link href="/dashboard/platform/encuesta" className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300">Encuesta</Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">Asignar planes</h2>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="space-y-3">
        {sellers.map((s) => (
          <div key={s.id} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-white/10">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{s.name}</p>
              <p className="text-xs text-gray-500 truncate">{s.slug} · {s.email || 'sin email'}</p>
            </div>
            <select
              value={s.planCode || 'free'}
              onChange={(e) => assign(s.id, e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
            >
              {PLAN_CODES.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </div>
        ))}
        {!sellers.length && <p className="text-gray-500 text-sm">Sin sellers</p>}
      </div>
    </DashboardLayout>
  );
}
