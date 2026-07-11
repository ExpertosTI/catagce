'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { API_URL, setAuth } from '@/lib/api';
import { AuthInput, AuthButton } from '@/components/AuthShell';

type Mode = 'register' | 'login';

type Step = 'phone' | 'code' | 'profile';

export function WhatsAppAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [statusHint, setStatusHint] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [purpose, setPurpose] = useState<'register' | 'login'>('login');
  const [profile, setProfile] = useState({
    sellerName: '', sellerSlug: '', name: '', email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/auth/whatsapp/status`)
      .then((r) => r.json())
      .then((d) => {
        setAvailable(Boolean(d.ready));
        setStatusHint(
          d.ready
            ? ''
            : `Instancia ${d.instance || '—'} · estado ${d.state || 'desconocido'} (Evolution remoto).`,
        );
      })
      .catch(() => {
        setAvailable(false);
        setStatusHint('No se pudo consultar /auth/whatsapp/status');
      });
  }, []);

  const afterAuth = async (token: string, apiKey: string) => {
    setAuth(apiKey || '', token);
    const onboarding = await fetch(`${API_URL}/sellers/onboarding`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).catch(() => ({ completed: true }));
    router.push(onboarding.completed ? '/dashboard' : '/onboarding');
  };

  const parseApiError = (data: { message?: string | string[] }, fallback: string) => {
    if (Array.isArray(data.message)) return data.message.join(', ');
    return data.message || fallback;
  };

  const sendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const checkRes = await fetch(`${API_URL}/auth/whatsapp/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const check = await checkRes.json();
      if (!checkRes.ok) throw new Error(parseApiError(check, 'No se pudo verificar el número'));
      if (!check.exists && mode === 'login') {
        throw new Error('No hay cuenta con este número. Crea una cuenta primero.');
      }
      if (check.exists && mode === 'register') {
        throw new Error('Este WhatsApp ya está registrado. Inicia sesión.');
      }
      const p = mode === 'login' ? 'login' : (check.exists ? 'login' : 'register');
      setPurpose(p);
      const res = await fetch(`${API_URL}/auth/whatsapp/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(parseApiError(data, 'No se pudo enviar el código'));
      setMasked(data.masked || '');
      setStep('code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/whatsapp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Código inválido');

      if (data.mode === 'login' || purpose === 'login') {
        await afterAuth(data.token, data.apiKey);
        return;
      }

      setVerificationToken(data.verificationToken);
      setStep('profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const completeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/whatsapp/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationToken, ...profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      await afterAuth(data.token, data.apiKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (key: string, value: string) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'sellerName' && !prev.sellerSlug) {
        next.sellerSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      return next;
    });
  };

  if (available === false) {
    return (
      <div className="text-center py-4">
        <MessageCircle className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">
          El acceso por WhatsApp no está disponible en este momento.
          {mode === 'register' ? ' Usa correo electrónico.' : ' Usa email o API Key.'}
        </p>
        {statusHint && (
          <p className="text-xs text-gray-500 mt-2 font-mono">{statusHint}</p>
        )}
      </div>
    );
  }

  if (step === 'phone') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Te enviaremos un código de 6 dígitos a tu WhatsApp para {mode === 'login' ? 'iniciar sesión' : 'verificar tu número'}.
        </p>
        <AuthInput
          label="Número de WhatsApp"
          value={phone}
          onChange={setPhone}
          placeholder="809 / 829 / 849…"
          required
        />
        <p className="text-[11px] text-gray-500 -mt-2">
          República Dominicana: prefijos <span className="text-gray-300 font-semibold">809</span>,{' '}
          <span className="text-gray-300 font-semibold">829</span> o{' '}
          <span className="text-gray-300 font-semibold">849</span> · 10 dígitos
        </p>
        {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
        <AuthButton type="button" loading={loading} onClick={sendCode}>
          {loading ? 'Enviando...' : 'Enviar código'}
        </AuthButton>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#6B7280]">
          Código enviado a <strong>{masked || phone}</strong>. Válido 10 minutos.
        </p>
        <AuthInput
          label="Código de verificación"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          required
        />
        {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
        <AuthButton type="button" loading={loading} onClick={verifyCode} disabled={code.length !== 6}>
          {loading ? 'Verificando...' : 'Verificar código'}
        </AuthButton>
        <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); }} className="w-full text-sm text-[#6B7280] hover:text-[#374151]">
          Cambiar número
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={completeRegister} className="space-y-4">
      <p className="text-sm text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2">
        WhatsApp verificado. Completa los datos de tu tienda.
      </p>
      <AuthInput label="Nombre del negocio" value={profile.sellerName} onChange={(v) => updateProfile('sellerName', v)} required />
      <AuthInput label="URL de tu tienda" value={profile.sellerSlug} onChange={(v) => updateProfile('sellerSlug', v)} required />
      <AuthInput label="Tu nombre" value={profile.name} onChange={(v) => updateProfile('name', v)} required />
      <AuthInput label="Correo (opcional)" type="email" value={profile.email} onChange={(v) => updateProfile('email', v)} placeholder="tu@empresa.com" />
        {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
      <AuthButton loading={loading}>{loading ? 'Creando cuenta...' : 'Crear mi tienda'}</AuthButton>
    </form>
  );
}
