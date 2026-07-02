'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 50000, creditDays: 30 });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      router.push('/dashboard/clients');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Nuevo cliente" />
      <form onSubmit={submit} className="card p-6 max-w-lg space-y-4">
        {(['name', 'email', 'phone', 'taxId', 'address'] as const).map((f) => (
          <div key={f}>
            <label className="text-sm font-medium capitalize">{f}</label>
            <input value={(form as any)[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="input mt-1" required={f === 'name' || f === 'email'} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Límite crédito</label>
            <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} className="input mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Días crédito</label>
            <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className="input mt-1" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">Crear cliente</button>
      </form>
    </DashboardLayout>
  );
}
