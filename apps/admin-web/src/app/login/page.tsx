'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { publicFetch, setAuth } from '../../lib/api';
import { SITE_URL } from '../../lib/site';

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
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xl">G</div>
          <div>
            <p className="font-bold text-lg">GHome Admin</p>
            <p className="text-sm text-slate-500">Panel de importación</p>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="input" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="input" />
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </div>
        <Link href={SITE_URL} className="block text-center text-sm text-blue-700 mt-6 hover:underline">
          ← Volver al sitio público
        </Link>
      </form>
    </div>
  );
}
