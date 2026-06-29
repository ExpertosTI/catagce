'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuth, apiFetch, clearAuth, API_URL } from '@/lib/api';
import { AuthShell, AuthInput, AuthButton, AuthLink } from '@/components/AuthShell';

export default function LoginPage() {
  const [mode, setMode] = useState<'apikey' | 'email'>('email');
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
      if (!res.ok) throw new Error(data.message);
      setAuth('', data.token);
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

  return (
    <AuthShell
      title="Iniciar sesión en Catagce"
      subtitle="Gestiona catálogos, inventario y pedidos B2B"
      footer={
        <>
          ¿No tienes cuenta? <AuthLink href="/register">Crear cuenta gratis</AuthLink>
        </>
      }
    >
      <div className="flex gap-1 p-1 bg-[#F4F5F7] rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            mode === 'email' ? 'bg-white text-[#1A1D26] shadow-sm' : 'text-[#6B7280]'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode('apikey')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            mode === 'apikey' ? 'bg-white text-[#1A1D26] shadow-sm' : 'text-[#6B7280]'
          }`}
        >
          API Key
        </button>
      </div>

      {mode === 'email' ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <AuthInput
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@empresa.com"
            autoComplete="email"
            required
          />
          <AuthInput
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>}
          <AuthButton loading={loading}>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</AuthButton>
        </form>
      ) : (
        <form onSubmit={handleApiKeyLogin} className="space-y-4">
          <AuthInput
            label="API Key"
            type="password"
            value={apiKey}
            onChange={setApiKeyInput}
            placeholder="cat_..."
            required
          />
          {error && <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>}
          <AuthButton loading={loading}>{loading ? 'Verificando...' : 'Entrar con API Key'}</AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
