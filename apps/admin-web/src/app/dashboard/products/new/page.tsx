'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ImageUploadField } from '../../../../components/ImageUploadField';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { CurrencyInput } from '../../../../components/CurrencyInput';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useAppDialog } from '../../../../components/AppDialogProvider';

export default function NewProductPage() {
  const router = useRouter();
  const { alert } = useAppDialog();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: 0, costPrice: 0, imageUrl: '', stockQty: 0, minStock: 0 });
  const [saleDisplay, setSaleDisplay] = useState('');
  const [costDisplay, setCostDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generateDescription() {
    if (!form.name.trim()) {
      await alert({ title: 'Nombre requerido', message: 'Escriba primero el nombre del producto', variant: 'info' });
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ description: string }>('/products/ai-describe', {
        method: 'POST',
        body: JSON.stringify({ name: form.name }),
      });
      setForm((f) => ({ ...f, description: res.description }));
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo generar la descripción', variant: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch<any>('/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          description: form.description || undefined,
          salePrice: form.salePrice,
          costPrice: form.costPrice || undefined,
          imageUrl: form.imageUrl || undefined,
          stockQty: form.stockQty || undefined,
          minStock: form.minStock || undefined,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'Error al crear producto', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <Link href="/dashboard/products" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a mercancía
      </Link>
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        <ImageUploadField value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} label="Foto del producto" />

        <FormField label="Código SKU">
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" required placeholder="GH-TV-001" />
        </FormField>
        <FormField label="Nombre">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
        </FormField>
        <FormField label="Descripción">
          <div className="space-y-2">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
            <button type="button" onClick={generateDescription} disabled={generating} className="action-chip action-chip-success text-xs disabled:opacity-50">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span className="!inline">{generating ? 'Generando...' : 'Generar con IA'}</span>
            </button>
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio de venta">
            <CurrencyInput
              value={saleDisplay}
              onChange={(num, display) => { setForm({ ...form, salePrice: num }); setSaleDisplay(display); }}
            />
          </FormField>
          <FormField label="Costo">
            <CurrencyInput
              value={costDisplay}
              onChange={(num, display) => { setForm({ ...form, costPrice: num }); setCostDisplay(display); }}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stock inicial">
            <QuantityStepper value={form.stockQty} onChange={(v) => setForm({ ...form, stockQty: v })} min={0} />
          </FormField>
          <FormField label="Stock mínimo">
            <QuantityStepper value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} min={0} />
          </FormField>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear producto'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
