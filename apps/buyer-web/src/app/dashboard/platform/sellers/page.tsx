'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlatformNav } from '@/components/PlatformNav';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type SellerRow = {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  planCode: string;
  isActive?: boolean;
  users?: Array<{ email: string; name: string; role?: string }>;
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
  const [tempPw, setTempPw] = useState<{ email: string; password: string; whatsappSent: boolean } | null>(null);

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

  const resetPassword = async (id: string, name: string) => {
    if (!window.confirm(`¿Restablecer contraseña de ${name}?`)) return;
    setError('');
    setTempPw(null);
    try {
      const res = await apiFetch<{
        email: string;
        temporaryPassword: string;
        whatsappSent: boolean;
      }>(`/platform/sellers/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ notifyWhatsApp: true }),
      });
      setTempPw({
        email: res.email,
        password: res.temporaryPassword,
        whatsappSent: res.whatsappSent,
      });
      setMsg('Contraseña restablecida');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo restablecer'));
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
      <PlatformNav active="/dashboard/platform/sellers" />

      <h2 className="text-2xl font-bold mb-6">Cuentas / planes</h2>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}
      {tempPw && (
        <div className="mb-4 glass rounded-xl p-4 border border-[#FF8A00]/40">
          <p className="text-sm font-semibold text-[#FF8A00] mb-1">Contraseña temporal (cópiala ahora)</p>
          <p className="text-sm text-gray-300">Email: <span className="font-mono text-white">{tempPw.email}</span></p>
          <p className="text-sm text-gray-300">
            Password: <span className="font-mono text-white select-all">{tempPw.password}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {tempPw.whatsappSent
              ? 'Aviso enviado por Cloud/WhatsApp de plataforma (sin incluir la contraseña).'
              : 'Aviso WhatsApp no enviado. Comparte la contraseña solo por el panel.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sellers.map((s) => (
          <div key={s.id} className="glass rounded-xl p-4 flex flex-col gap-3 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {s.slug} · {s.email || s.users?.[0]?.email || 'sin email'} · {s.phone || 'sin tel'}
                </p>
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
              <button
                type="button"
                onClick={() => resetPassword(s.id, s.name)}
                className="px-3 py-2 rounded-xl bg-white/10 text-sm font-semibold hover:bg-white/15"
              >
                Reset password
              </button>
            </div>
          </div>
        ))}
        {!sellers.length && <p className="text-gray-500 text-sm">Sin sellers</p>}
      </div>
    </DashboardLayout>
  );
}
