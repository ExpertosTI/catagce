'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth, API_URL } from '@/lib/api';
import { AuthShell, AuthInput, AuthButton, AuthLink } from '@/components/AuthShell';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';

export default function RegisterPage() {
  const [tab, setTab] = useState<'email' | 'whatsapp'>('email');
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
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAuth(data.apiKey, data.token);
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
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
    <AuthShell
      title="Crea tu cuenta en Catagce"
      subtitle="Configura tu tienda B2B en minutos"
      footer={
        <>
          ¿Ya tienes cuenta? <AuthLink href="/login">Iniciar sesión</AuthLink>
        </>
      }
    >
      <div className="flex gap-1 p-1 bg-[#F4F5F7] rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setTab('email')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            tab === 'email' ? 'bg-white text-[#1A1D26] shadow-sm' : 'text-[#6B7280]'
          }`}
        >
          Correo
        </button>
        <button
          type="button"
          onClick={() => setTab('whatsapp')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            tab === 'whatsapp' ? 'bg-white text-[#1A1D26] shadow-sm' : 'text-[#6B7280]'
          }`}
        >
          WhatsApp
        </button>
      </div>

      {tab === 'email' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput label="Nombre del negocio" value={form.sellerName} onChange={(v) => update('sellerName', v)} placeholder="Mi Empresa SRL" required />
          <AuthInput label="URL de tu tienda" value={form.sellerSlug} onChange={(v) => update('sellerSlug', v)} placeholder="mi-empresa" required />
          <AuthInput label="Tu nombre" value={form.name} onChange={(v) => update('name', v)} placeholder="Juan Pérez" required />
          <AuthInput label="Correo electrónico" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="tu@empresa.com" required />
          <AuthInput label="Contraseña" type="password" value={form.password} onChange={(v) => update('password', v)} minLength={6} required />
          <AuthInput label="WhatsApp del negocio (opcional)" value={form.phone} onChange={(v) => update('phone', v)} placeholder="8095551234" />
          {error && <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>}
          <AuthButton loading={loading}>{loading ? 'Creando cuenta...' : 'Crear mi tienda'}</AuthButton>
        </form>
      ) : (
        <WhatsAppAuth mode="register" />
      )}
    </AuthShell>
  );
}
