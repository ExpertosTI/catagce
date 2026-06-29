'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Box } from 'lucide-react';
import { setAuth, apiFetch, clearAuth } from '@/lib/api';

export default function LoginPage() {
  const [mode, setMode] = useState<'apikey' | 'email'>('email');
  const [email, setEmail] = useState('demo@renace.tech');
  const [password, setPassword] = useState('demo1234');
  const [apiKey, setApiKeyInput] = useState('cat_demo_renace_2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAuth('', data.token);
      const onboarding = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/sellers/onboarding`, {
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((r) => r.json()).catch(() => ({ completed: true }));
      router.push(onboarding.completed ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Box className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter">CATAGCE</span>
        </div>

        <div className="glass rounded-3xl p-8">
          <div className="flex gap-2 mb-6">
            <button type="button" onClick={() => setMode('email')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === 'email' ? 'bg-[#00D1FF] text-black' : 'bg-white/5 text-gray-400'}`}>
              Email
            </button>
            <button type="button" onClick={() => setMode('apikey')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === 'apikey' ? 'bg-[#00D1FF] text-black' : 'bg-white/5 text-gray-400'}`}>
              API Key
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><Mail className="w-4 h-4" /> Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]" required />
              </div>
              <div>
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><Lock className="w-4 h-4" /> Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]" required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-[#00D1FF] text-black font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar'} <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleApiKeyLogin} className="space-y-4">
              <input type="password" value={apiKey} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="cat_..." className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none font-mono text-sm" required />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-[#00D1FF] text-black font-bold rounded-xl disabled:opacity-50">
                {loading ? 'Verificando...' : 'Entrar con API Key'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta? <Link href="/register" className="text-[#00D1FF] hover:underline">Regístrate</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
