'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Lock, Mail, User } from 'lucide-react';
import { publicFetch, setAuth } from '../../lib/api';
import { COMPANY_SLUG } from '../../lib/site';
import { PORTAL_PAGE } from '../../lib/page-titles';
import { OAuthButtons } from '../../components/OAuthButtons';
import { isFirebaseConfigured } from '../../lib/firebase';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/portal';
  const oauthEnabled = isFirebaseConfigured();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companySlug, setCompanySlug] = useState(COMPANY_SLUG);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await publicFetch<{ token: string; client: object }>('/auth/client/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, companySlug }),
      });
      setAuth(res.token, res.client);
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await publicFetch<{ message: string }>('/auth/client/register', {
        method: 'POST',
        body: JSON.stringify({ companySlug, name, email, password }),
      });
      setMessage(res.message);
      setMode('login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  function handleOAuthSuccess() {
    router.push(redirect);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8 shadow-2xl shadow-blue-950/30">
          <Link href="/" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Volver al inicio
          </Link>

          <div className="flex items-center gap-3 mt-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-extrabold shadow-sm">G</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'login' ? PORTAL_PAGE.login.title : PORTAL_PAGE.login.registerTitle}
              </h1>
              <p className="text-slate-500 text-sm">{PORTAL_PAGE.login.subtitle}</p>
            </div>
          </div>

          <div className="segmented-control mt-5">
            <button type="button" onClick={() => setMode('login')} className={`segmented-option flex-1 ${mode === 'login' ? 'segmented-option-active' : ''}`}>
              Iniciar sesión
            </button>
            <button type="button" onClick={() => setMode('register')} className={`segmented-option flex-1 ${mode === 'register' ? 'segmented-option-active' : ''}`}>
              Registrarse
            </button>
          </div>

          {mode === 'login' && (
            <div className="mt-4">
              <label className="form-label">Empresa</label>
              <input value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="generalhome" className="input w-full" />
            </div>
          )}

          {mode === 'login' && oauthEnabled && (
            <div className="mt-4">
              <OAuthButtons
                companySlug={companySlug}
                onSuccess={handleOAuthSuccess}
                onError={setError}
                onNewUser={() => setMessage('¡Bienvenido! Su cuenta fue creada correctamente.')}
              />
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">o con correo</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4 mt-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}
            {message && (
              <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
                <Check size={16} /> {message}
              </p>
            )}
            {mode === 'register' && (
              <div>
                <label className="form-label">Nombre comercial</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={name} onChange={(e) => setName(e.target.value)} required className="input !pl-10" />
                </div>
              </div>
            )}
            {mode === 'register' && (
              <div>
                <label className="form-label">Empresa</label>
                <input value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="generalhome" className="input w-full" />
              </div>
            )}
            <div>
              <label className="form-label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input !pl-10" />
              </div>
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input !pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar al portal' : 'Enviar registro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
