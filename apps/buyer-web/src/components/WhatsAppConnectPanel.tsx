'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Unplug, QrCode, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';

type Status = {
  platformOk: boolean;
  connected: boolean;
  state: string | null;
  instance: string | null;
  phone: string | null;
  message: string;
};

export function WhatsAppConnectPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const s = await apiFetch<Status>('/whatsapp-connect/status');
      setStatus(s);
      if (s.connected) setQr(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!qr || status?.connected) return;
    const timer = setInterval(() => { loadStatus(); }, 4000);
    return () => clearInterval(timer);
  }, [qr, status?.connected, loadStatus]);

  const start = async () => {
    setLoading(true);
    setError('');
    setHint('');
    try {
      const res = await apiFetch<{ connected: boolean; qr: string | null; message: string }>(
        '/whatsapp-connect/start',
        { method: 'POST' },
      );
      setHint(res.message);
      if (res.connected) {
        setQr(null);
        await loadStatus();
      } else {
        setQr(res.qr);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo iniciar la conexión'));
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/whatsapp-connect/disconnect', { method: 'POST' });
      setQr(null);
      await loadStatus();
      setHint('WhatsApp desconectado');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 max-w-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#25D366]" />
        </div>
        <div>
          <h3 className="font-bold">WhatsApp de tu negocio</h3>
          <p className="text-sm text-gray-400 mt-1">
            Conecta el número de tu empresa escaneando un QR. Se usa para difusión, compartir catálogos y notificaciones.
          </p>
        </div>
      </div>

      {status && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          status.connected
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-white/5 border-white/10 text-gray-300'
        }`}>
          {status.connected ? (
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Conectado{status.phone ? ` · ${status.phone}` : ''}
              {status.instance ? ` · ${status.instance}` : ''}
            </p>
          ) : (
            <p>{status.message}</p>
          )}
          {status.state && !status.connected && (
            <p className="text-xs text-gray-500 mt-1">Estado: {status.state}</p>
          )}
        </div>
      )}

      {qr && (
        <div className="flex flex-col items-center gap-3 py-4">
          <img src={qr} alt="QR WhatsApp" className="w-56 h-56 rounded-xl bg-white p-2" />
          <p className="text-xs text-gray-400 text-center max-w-xs">
            WhatsApp → Dispositivos vinculados → Vincular un dispositivo
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {hint && !error && <p className="text-sm text-[#00D1FF]">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {!status?.connected ? (
          <>
            <button
              type="button"
              onClick={start}
              disabled={loading || status?.platformOk === false}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-sm disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              {loading ? 'Generando QR...' : qr ? 'Nuevo QR' : 'Conectar WhatsApp'}
            </button>
            {qr && (
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Actualizar QR
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={disconnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 text-sm"
          >
            <Unplug className="w-4 h-4" /> Desconectar
          </button>
        )}
      </div>
    </div>
  );
}
