'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';
import { publicFetch, setAuth } from '../../lib/api';
import { SITE_URL } from '../../lib/site';
import { PAGE } from '../../lib/page-titles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@generalhome.tech');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await publicFetch<{ token: string; user: object }>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuth(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="card p-8 shadow-2xl shadow-blue-950/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-blue-600/30">
              G
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900">GHome Admin</p>
              <p className="text-sm text-slate-500">{PAGE.login.subtitle}</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-5">{PAGE.login.title}</h1>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl mb-4">{error}</p>
          )}

          <div className="space-y-4">
            <div>
              <label className="form-label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input !pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input !pl-10"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 mt-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        <Link
          href={SITE_URL}
          className="mt-5 flex items-center justify-center gap-1.5 text-sm text-blue-200/90 hover:text-white transition"
        >
          <ArrowLeft size={14} /> Volver al sitio público
        </Link>
      </div>
    </div>
  );
}
