'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Link2, QrCode, RefreshCw, Unlink, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlatformNav } from '@/components/PlatformNav';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMe } from '@/lib/features';

type Status = {
  platformOk: boolean;
  channel?: string;
  linked: boolean;
  connected: boolean;
  state: string | null;
  instance: string | null;
  phone: string | null;
  profileDisplayName: string;
  notifyChannel?: string;
  message: string;
  meta?: {
    configured: boolean;
    phoneNumberId: string | null;
    wabaId: string | null;
    otpTemplate: string;
    otpLang: string;
    notifyTemplate: string | null;
    hasToken: boolean;
  };
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

  const [token, setToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [otpTemplate, setOtpTemplate] = useState('catagce_otp');
  const [otpLang, setOtpLang] = useState('es');
  const [notifyTemplate, setNotifyTemplate] = useState('');
  const [notifyChannel, setNotifyChannel] = useState('cloud');
  const [testPhone, setTestPhone] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<Status>('/platform/whatsapp');
      setStatus(s);
      if (s.instance) setInstance(String(s.instance).replace(/^meta:/, ''));
      if (s.profileDisplayName) setDisplayName(s.profileDisplayName);
      if (s.notifyChannel) setNotifyChannel(s.notifyChannel);
      if (s.meta?.phoneNumberId) setPhoneNumberId(s.meta.phoneNumberId);
      if (s.meta?.wabaId) setWabaId(s.meta.wabaId);
      if (s.meta?.otpTemplate) setOtpTemplate(s.meta.otpTemplate);
      if (s.meta?.otpLang) setOtpLang(s.meta.otpLang);
      if (s.meta?.notifyTemplate) setNotifyTemplate(s.meta.notifyTemplate);
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

  const saveCloud = async () => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const s = await apiFetch<Status>('/platform/whatsapp/cloud', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: token || undefined,
          phoneNumberId,
          wabaId: wabaId || undefined,
          otpTemplate,
          otpLang,
          notifyTemplate: notifyTemplate || undefined,
          notifyChannel,
        }),
      });
      setStatus(s);
      setToken('');
      setMsg('Cloud API guardado — canal oficial para OTP/avisos');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar Cloud API'));
    } finally {
      setLoading(false);
    }
  };

  const testOtp = async () => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await apiFetch<{ note: string }>('/platform/whatsapp/cloud/test-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: testPhone }),
      });
      setMsg(res.note || 'OTP de prueba enviado');
    } catch (err) {
      setError(getErrorMessage(err, 'Falló el OTP de prueba'));
    } finally {
      setLoading(false);
    }
  };

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
      setMsg(s.connected ? 'Evolution vinculado y Connected' : 'Evolution vinculado — falta Connected');
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
      setMsg('Nombre Evolution guardado');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el nombre'));
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    if (!window.confirm('¿Desvincular Evolution de plataforma?')) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch('/platform/whatsapp/unlink', { method: 'POST' });
      setQr(null);
      setMsg('Evolution desvinculado');
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
      <p className="text-sm text-gray-400 mb-6 max-w-2xl">
        Usa <strong className="text-white">Cloud API (Meta)</strong> para OTP y avisos oficiales (menos ban).
        Evolution queda para sellers o como respaldo. Las difusiones Baileys del seller
        <strong className="text-white"> no usan</strong> el número Cloud, pero sí pueden quemar el WA vinculado del seller.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-[#00D1FF]">{msg}</p>}

      <div className="glass rounded-2xl p-5 max-w-2xl mb-6 space-y-2 text-sm">
        <h2 className="font-bold text-white">Webhook Meta (inbound / statuses)</h2>
        <p className="text-gray-400">
          En Meta App → WhatsApp → Configuration, callback URL:
        </p>
        <code className="block break-all rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-[#00D1FF]">
          https://api.catagce.renace.tech/api/webhooks/meta
        </code>
        <p className="text-gray-400">
          Verify token = <code className="text-gray-200">META_WA_VERIFY_TOKEN</code> en{' '}
          <code className="text-gray-200">.meta-wa.local</code> del servidor.
          App Secret = <code className="text-gray-200">META_WA_APP_SECRET</code> (firma{' '}
          <code className="text-gray-200">X-Hub-Signature-256</code>).
        </p>
        <p className="text-xs text-gray-500">
          Suscribe el campo <code className="text-gray-400">messages</code> para statuses delivered/read/failed.
        </p>
      </div>

      {status && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border max-w-2xl ${
          status.connected
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-white/5 border-white/10 text-gray-300'
        }`}>
          <p className="flex items-center gap-2">
            {status.connected && <CheckCircle2 className="w-4 h-4" />}
            {status.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Canal: {status.channel || '—'} · estado: {status.state || '—'}
          </p>
        </div>
      )}

      <div className="glass rounded-2xl p-6 max-w-2xl space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D1FF]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00D1FF]" />
          </div>
          <div>
            <h2 className="font-bold">Meta Cloud API (oficial)</h2>
            <p className="text-sm text-gray-400 mt-1">
              Phone Number ID + token permanente + plantilla AUTHENTICATION aprobada (ej. catagce_otp).
            </p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-gray-400">Access token (déjalo vacío si ya está en .env / guardado)</span>
          <input
            type="password"
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={status?.meta?.hasToken ? '•••• (ya configurado)' : 'EAAG…'}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400">Phone Number ID</span>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-gray-400">WABA ID (opcional)</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Canal preferido</span>
            <select
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={notifyChannel}
              onChange={(e) => setNotifyChannel(e.target.value)}
            >
              <option value="cloud">cloud (Meta)</option>
              <option value="evolution">evolution (legacy)</option>
            </select>
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-gray-400">Plantilla OTP</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={otpTemplate}
              onChange={(e) => setOtpTemplate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Idioma plantilla</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={otpLang}
              onChange={(e) => setOtpLang(e.target.value)}
              placeholder="es"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-gray-400">Plantilla avisos (utility, opcional)</span>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
            value={notifyTemplate}
            onChange={(e) => setNotifyTemplate(e.target.value)}
            placeholder="catagce_notify"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveCloud}
            disabled={loading || !phoneNumberId}
            className="px-4 py-2.5 rounded-xl bg-[#00D1FF] text-black font-bold text-sm disabled:opacity-50"
          >
            Guardar Cloud API
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-2">
          <label className="block text-sm">
            <span className="text-gray-400">Probar OTP (tu número RD)</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="8495684958"
            />
          </label>
          <button
            type="button"
            onClick={testOtp}
            disabled={loading || !testPhone}
            className="px-4 py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-sm disabled:opacity-50"
          >
            Enviar OTP de prueba
          </button>
        </div>
      </div>

      <details className="glass rounded-2xl p-6 max-w-2xl">
        <summary className="cursor-pointer font-bold text-gray-300">Evolution (legacy / sellers)</summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-400">
            Solo si aún no tienes Cloud API. Riesgo de ban de sesión Baileys.
          </p>
          <label className="block text-sm">
            <span className="text-gray-400">Instancia Evolution</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Nombre visible Evolution</span>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          {qr && (
            <div className="flex flex-col items-center gap-3 py-2">
              <img src={qr} alt="QR" className="w-56 h-56 rounded-xl bg-white p-2" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={link} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm">
              <Link2 className="w-4 h-4" /> Vincular
            </button>
            <button type="button" onClick={startQr} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm">
              <QrCode className="w-4 h-4" /> QR
            </button>
            <button type="button" onClick={saveName} disabled={loading} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm">
              Guardar nombre
            </button>
            {status?.linked && (
              <button type="button" onClick={unlink} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 text-sm">
                <Unlink className="w-4 h-4" /> Desvincular
              </button>
            )}
          </div>
        </div>
      </details>
    </DashboardLayout>
  );
}
