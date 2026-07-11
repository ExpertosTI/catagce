'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlatformNav } from '@/components/PlatformNav';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type SurveyAdmin = {
  isOpen: boolean;
  endsAt: string;
  totalVotes: number;
  ranking: Array<{ id: string; name: string; points: number; first: number; second: number; third: number }>;
  suggestions: Array<{ id: string; suggestion: string; createdAt: string }>;
  options?: Array<{ id: string; name: string }>;
};

export default function PlatformEncuestaPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const { isPlatformAdmin, loading: meLoading } = useMe();
  const [data, setData] = useState<SurveyAdmin | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    apiFetch<SurveyAdmin>('/platform/survey')
      .then(setData)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      });
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    load();
  }, [ensureAuth]);

  const patch = async (body: Record<string, unknown>) => {
    setError('');
    try {
      await apiFetch('/platform/survey', { method: 'PATCH', body: JSON.stringify(body) });
      setMsg('Encuesta actualizada');
      setTimeout(() => setMsg(''), 2000);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar'));
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
      <PlatformNav active="/dashboard/platform/encuesta" />

      <h2 className="text-2xl font-bold mb-2">Encuesta de nombres</h2>
      <p className="text-sm text-gray-400 mb-4">
        Pública en <Link href="/encuesta" className="text-[#00D1FF] underline">/encuesta</Link>
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      {data && (
        <>
          <div className="glass rounded-2xl p-4 mb-6 border border-white/10 space-y-3">
            <p className="text-sm">
              Estado: <strong className={data.isOpen ? 'text-green-400' : 'text-red-400'}>{data.isOpen ? 'Abierta' : 'Cerrada'}</strong>
              {' · '}Cierra: {new Date(data.endsAt).toLocaleString()}
              {' · '}Votos: {data.totalVotes}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => patch({ isOpen: true })} className="px-3 py-2 rounded-xl bg-[#25D366] text-black text-sm font-bold">Abrir</button>
              <button type="button" onClick={() => patch({ isOpen: false })} className="px-3 py-2 rounded-xl bg-white/10 text-sm">Cerrar</button>
              <button type="button" onClick={() => patch({ extendDays: 3 })} className="px-3 py-2 rounded-xl bg-[#00D1FF] text-black text-sm font-bold">+3 días</button>
            </div>
          </div>

          <h3 className="font-bold mb-3">Ranking (1º=3, 2º=2, 3º=1)</h3>
          <div className="space-y-2 mb-8">
            {data.ranking.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10">
                <span className="text-[#FF8A00] font-black w-6">{i + 1}</span>
                <span className="flex-1 font-semibold">{r.name}</span>
                <span className="text-sm text-gray-400">{r.points} pts</span>
                <span className="text-xs text-gray-500">{r.first}/{r.second}/{r.third}</span>
              </div>
            ))}
          </div>

          <h3 className="font-bold mb-3">Sugerencias</h3>
          <div className="space-y-2">
            {(data.suggestions || []).map((s) => (
              <div key={s.id} className="text-sm glass rounded-lg px-3 py-2 border border-white/5">
                {s.suggestion}
              </div>
            ))}
            {!data.suggestions?.length && <p className="text-gray-500 text-sm">Sin sugerencias aún</p>}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
