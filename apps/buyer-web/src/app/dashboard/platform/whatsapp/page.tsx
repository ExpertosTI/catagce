'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Link2, QrCode, RefreshCw, Unlink } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlatformNav } from '@/components/PlatformNav';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type Status = {
  platformOk: boolean;
  linked: boolean;
  connected: boolean;
  state: string | null;
  instance: string | null;
  phone: string | null;
  profileDisplayName: string;
  message: string;
};

export default function PlatformWhatsAppPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const { isPlatformAdmin, loading: meLoading } = useMe();
  const [status, setStatus] = useState<Status | null>(null);
  const [instance, setInstance] = useState('RENACE.TECH');
  const [displayName, setDisplayName] = useState('RENACE.TECH');
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<Status>('/platform/whatsapp');
      setStatus(s);
      if (s.instance) setInstance(s.instance);
      if (s.profileDisplayName) setDisplayName(s.profileDisplayName);
      if (s.connected) setQr(null);
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    }
  }, [onApiError]);

  useEffect(() => {
    if (!ensureAuth()) return;
    load();
  }, [ensureAuth, load]);

  useEffect(() => {
    if (!qr || status?.connected) return;
    const t = setInterval(() => { load(); }, 4000);
    return () => clearInterval(t);
  }, [qr, status?.connected, load]);

  const link = async () => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const s = await apiFetch<Status>('/platform/whatsapp/link', {
        method: 'POST',
        body: JSON.stringify({ instance, displayName }),
      });
      setStatus(s);
      setMsg(s.connected ? 'Vinculado y Connected' : 'Vinculado — falta Connected en Evolution');
      setQr(null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo vincular'));
    } finally {
      setLoading(false);
    }
  };

  const startQr = async () => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await apiFetch<{ connected: boolean; qr: string | null; message: string }>(
        '/platform/whatsapp/qr',
        { method: 'POST' },
      );
      setMsg(res.message);
      if (res.connected) {
        setQr(null);
        await load();
      } else {
        setQr(res.qr);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar QR'));
    } finally {
      setLoading(false);
    }
  };

  const saveName = async () => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/platform/whatsapp/display-name', {
        method: 'POST',
        body: JSON.stringify({ name: displayName }),
      });
      setMsg('Nombre de perfil guardado');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el nombre'));
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    if (!window.confirm('¿Desvincular WhatsApp de plataforma?')) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch('/platform/whatsapp/unlink', { method: 'POST' });
      setQr(null);
      setMsg('Desvinculado');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
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
      <PlatformNav active="/dashboard/platform/whatsapp" />
      <h1 className="text-2xl font-bold mb-2">WhatsApp de plataforma</h1>
      <p className="text-sm text-gray-400 mb-6 max-w-xl">
        Número de uso general: login OTP, avisos de admin y mensajes de Catagce.
        Cada seller sigue conectando el suyo en Configuración.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-[#00D1FF]">{msg}</p>}

      <div className="glass rounded-2xl p-6 max-w-lg space-y-4">
        {status && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${
            status.connected
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-white/5 border-white/10 text-gray-300'
          }`}>
            {status.connected ? (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Connected{status.instance ? ` · ${status.instance}` : ''}
              </p>
            ) : (
              <p>{status.message}</p>
            )}
            {status.state && (
              <p className="text-xs text-gray-500 mt-1">Estado: {status.state}</p>
            )}
          </div>
        )}

        <label className="block text-sm">
          <span className="text-gray-400">Instancia en Evolution</span>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
            value={instance}
            onChange={(e) => setInstance(e.target.value)}
            placeholder="RENACE.TECH"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-400">Nombre visible (empresa)</span>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="RENACE.TECH"
          />
        </label>

        {qr && (
          <div className="flex flex-col items-center gap-3 py-2">
            <img src={qr} alt="QR WhatsApp plataforma" className="w-56 h-56 rounded-xl bg-white p-2" />
            <p className="text-xs text-gray-400 text-center">
              WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={link}
            disabled={loading || !status?.platformOk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D1FF] text-black font-bold text-sm disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            {loading ? '...' : 'Vincular instancia'}
          </button>
          <button
            type="button"
            onClick={startQr}
            disabled={loading || !status?.platformOk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-sm disabled:opacity-50"
          >
            <QrCode className="w-4 h-4" />
            {qr ? 'Nuevo QR' : 'QR conectar'}
          </button>
          <button
            type="button"
            onClick={saveName}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm"
          >
            Guardar nombre
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          {status?.linked && (
            <button
              type="button"
              onClick={unlink}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 text-sm"
            >
              <Unlink className="w-4 h-4" /> Desvincular
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
