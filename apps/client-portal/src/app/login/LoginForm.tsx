'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicFetch, setAuth } from '../../lib/api';
import { COMPANY_SLUG } from '../../lib/site';
import { PORTAL_PAGE } from '../../lib/page-titles';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/portal';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('cliente@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [name, setName] = useState('');
  const [companySlug, setCompanySlug] = useState(COMPANY_SLUG);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await publicFetch<{ token: string; client: object }>('/auth/client/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, companySlug }),
      });
      setAuth(res.token, res.client);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await publicFetch<{ message: string }>('/auth/client/register', {
        method: 'POST',
        body: JSON.stringify({ companySlug, name, email, password }),
      });
      setMessage(res.message);
      setMode('login');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md card p-6 sm:p-8 shadow-sm">
        <Link href="/" className="text-blue-700 font-bold text-sm">← Volver al inicio</Link>
        <h1 className="text-2xl font-bold mt-4">
          {mode === 'login' ? `${PORTAL_PAGE.login.emoji} ${PORTAL_PAGE.login.title}` : PORTAL_PAGE.login.registerTitle}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{PORTAL_PAGE.login.subtitle}</p>

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Iniciar sesión</button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'register' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Registrarse</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4 mt-6">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          {message && <p className="text-emerald-700 text-sm bg-emerald-50 p-3 rounded-lg">{message}</p>}
          {mode === 'register' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre comercial" required className="input" />
          )}
          <input value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="Empresa (generalhome)" className="input w-full" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required className="input w-full" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="input w-full" />
          <button type="submit" className="btn-primary w-full">
            {mode === 'login' ? 'Entrar al portal' : 'Enviar registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
