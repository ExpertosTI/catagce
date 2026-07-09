'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth, apiFetch, clearAuth, API_URL } from '@/lib/api';
import { AuthShell, AuthInput, AuthButton, AuthLink, AuthTabs } from '@/components/AuthShell';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';

type LoginMode = 'email' | 'whatsapp' | 'apikey';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');
      setAuth(data.apiKey || '', data.token);
      const onboarding = await fetch(`${API_URL}/sellers/onboarding`, {
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((r) => r.json()).catch(() => ({ completed: true }));
      router.push(onboarding.completed ? '/dashboard' : '/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setAuth(apiKey);
      await apiFetch('/sellers/me');
      router.push('/dashboard');
    } catch {
      setError('API key inválida');
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'email' as const, label: 'Email' },
    { id: 'whatsapp' as const, label: 'WhatsApp' },
    { id: 'apikey' as const, label: 'API Key' },
  ];

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Gestiona catálogos, inventario y pedidos B2B"
      footer={
        <>
          ¿No tienes cuenta? <AuthLink href="/register">Crear cuenta gratis</AuthLink>
        </>
      }
    >
      <AuthTabs tabs={tabs} active={mode} onChange={(id) => { setMode(id); setError(''); }} />

      {mode === 'email' && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="tu@empresa.com" autoComplete="email" required />
          <AuthInput label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
          {error && <AuthError message={error} />}
          <AuthButton loading={loading}>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</AuthButton>
        </form>
      )}

      {mode === 'whatsapp' && <WhatsAppAuth mode="login" />}

      {mode === 'apikey' && (
        <form onSubmit={handleApiKeyLogin} className="space-y-4">
          <AuthInput label="API Key" type="password" value={apiKey} onChange={setApiKeyInput} placeholder="cat_..." required />
          {error && <AuthError message={error} />}
          <AuthButton loading={loading}>{loading ? 'Verificando...' : 'Entrar con API Key'}</AuthButton>
        </form>
      )}
    </AuthShell>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{message}</p>
  );
}
