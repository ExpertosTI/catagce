'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth, API_URL } from '@/lib/api';
import { AuthShell, AuthInput, AuthButton, AuthLink, AuthTabs } from '@/components/AuthShell';
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
      title="Crea tu cuenta"
      subtitle="Configura tu tienda B2B en minutos"
      footer={
        <>
          ¿Ya tienes cuenta? <AuthLink href="/login">Iniciar sesión</AuthLink>
        </>
      }
    >
      <AuthTabs
        tabs={[
          { id: 'email' as const, label: 'Correo' },
          { id: 'whatsapp' as const, label: 'WhatsApp' },
        ]}
        active={tab}
        onChange={(id) => { setTab(id); setError(''); }}
      />

      {tab === 'email' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput label="Nombre del negocio" value={form.sellerName} onChange={(v) => update('sellerName', v)} placeholder="Mi Empresa SRL" required />
          <AuthInput label="URL de tu tienda" value={form.sellerSlug} onChange={(v) => update('sellerSlug', v)} placeholder="mi-empresa" required />
          <AuthInput label="Tu nombre" value={form.name} onChange={(v) => update('name', v)} placeholder="Juan Pérez" required />
          <AuthInput label="Correo electrónico" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="tu@empresa.com" required />
          <AuthInput label="Contraseña" type="password" value={form.password} onChange={(v) => update('password', v)} minLength={6} required />
          <AuthInput label="WhatsApp del negocio (opcional)" value={form.phone} onChange={(v) => update('phone', v)} placeholder="8095551234" />
          {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
          <AuthButton loading={loading}>{loading ? 'Creando cuenta...' : 'Crear mi tienda'}</AuthButton>
        </form>
      ) : (
        <WhatsAppAuth mode="register" />
      )}
    </AuthShell>
  );
}
