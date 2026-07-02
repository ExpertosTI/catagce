'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { apiFetch } from '../../../../lib/api';

const fields: Array<{ key: keyof typeof defaultForm; label: string; type?: string; required?: boolean }> = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
  { key: 'phone', label: 'Teléfono (WhatsApp)' },
  { key: 'taxId', label: 'RNC / Cédula' },
  { key: 'address', label: 'Dirección' },
];

const defaultForm = { name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 0, creditDays: 30 };

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch<any>(`/clients/${params.id}`).then((c) => {
      setForm({
        name: c.name ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        taxId: c.taxId ?? '',
        address: c.address ?? '',
        creditLimit: parseFloat(c.creditLimit || '0'),
        creditDays: c.creditDays ?? 30,
      });
      setReady(true);
    }).catch(console.error);
  }, [params.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/clients/${params.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      router.push('/dashboard/clients');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <DashboardLayout>
        <div className="animate-pulse h-64 bg-slate-100 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Editar cliente" subtitle="Actualice los datos del cliente" />
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        {fields.map(({ key, label, type, required }) => (
          <FormField key={key} label={label}>
            <input
              type={type ?? 'text'}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="input"
              required={required}
            />
          </FormField>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Límite de crédito">
            <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} className="input" />
          </FormField>
          <FormField label="Días de crédito">
            <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className="input" />
          </FormField>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
