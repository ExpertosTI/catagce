'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type PlanFeature = {
  id: string;
  planCode: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
};

type Plan = {
  code: string;
  name: string;
  description?: string;
  features: PlanFeature[];
};

export default function PlatformPlansPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const { isPlatformAdmin, loading: meLoading } = useMe();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    apiFetch<Plan[]>('/plans')
      .then(setPlans)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      });
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    load();
  }, [ensureAuth]);

  const toggle = async (planCode: string, featureKey: string, enabled: boolean, limitValue: number | null) => {
    setError('');
    try {
      await apiFetch(`/plans/${planCode}/features/${featureKey}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !enabled, limitValue }),
      });
      setMsg('Feature actualizada');
      setTimeout(() => setMsg(''), 2000);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar'));
    }
  };

  const setLimit = async (planCode: string, featureKey: string, enabled: boolean, raw: string) => {
    const limitValue = raw.trim() === '' ? null : parseInt(raw, 10);
    if (raw.trim() !== '' && Number.isNaN(limitValue)) return;
    try {
      await apiFetch(`/plans/${planCode}/features/${featureKey}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled, limitValue }),
      });
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar límite'));
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
        <Link href="/dashboard/platform/plans" className="px-3 py-1.5 rounded-lg bg-[#00D1FF]/20 text-[#00D1FF]">Planes</Link>
        <Link href="/dashboard/platform/sellers" className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300">Sellers</Link>
        <Link href="/dashboard/platform/encuesta" className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300">Encuesta</Link>
      </div>

      <h2 className="text-2xl font-bold mb-2">Planes y features</h2>
      <p className="text-sm text-gray-400 mb-6">Activa o desactiva módulos por plan. Límite vacío = ilimitado.</p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="space-y-6">
        {plans.map((plan) => (
          <div key={plan.code} className="glass rounded-2xl p-5 border border-white/10">
            <h3 className="font-bold text-lg">{plan.name} <span className="text-gray-500 text-sm font-mono">({plan.code})</span></h3>
            {plan.description && <p className="text-sm text-gray-400 mb-4">{plan.description}</p>}
            <div className="space-y-2">
              {(plan.features || []).map((f) => (
                <div key={f.featureKey} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <button
                    type="button"
                    onClick={() => toggle(plan.code, f.featureKey, f.enabled, f.limitValue)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${f.enabled ? 'bg-[#25D366]' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${f.enabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <span className="flex-1 text-sm font-mono">{f.featureKey}</span>
                  <input
                    type="number"
                    placeholder="∞"
                    defaultValue={f.limitValue ?? ''}
                    onBlur={(e) => setLimit(plan.code, f.featureKey, f.enabled, e.target.value)}
                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
