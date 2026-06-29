'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Box, ArrowRight } from 'lucide-react';
import { setAuth } from '@/lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    sellerName: '', sellerSlug: '', name: '', email: '', password: '', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAuth(data.apiKey, data.token);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'sellerName' && !prev.sellerSlug) {
        next.sellerSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Box className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-black">CATAGCE</span>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-4">
          <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
          <p className="text-gray-400 text-sm mb-4">Configura tu tienda B2B en minutos</p>

          <input placeholder="Nombre de tu negocio" value={form.sellerName} onChange={(e) => update('sellerName', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00D1FF]" required />
          <input placeholder="slug-tu-negocio" value={form.sellerSlug} onChange={(e) => update('sellerSlug', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none font-mono text-sm" required />
          <input placeholder="Tu nombre" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" required />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" required />
          <input type="password" placeholder="Contraseña (mín. 6)" value={form.password} onChange={(e) => update('password', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" minLength={6} required />
          <input placeholder="WhatsApp (opcional)" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none" />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-[#FF8A00] text-black font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear mi tienda'} <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta? <Link href="/login" className="text-[#00D1FF] hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
