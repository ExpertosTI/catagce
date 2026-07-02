'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ImageUploadField } from '../../../../components/ImageUploadField';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: '', costPrice: '', imageUrl: '', stockQty: 0, minStock: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generateDescription() {
    if (!form.name.trim()) {
      alert('Escriba primero el nombre del producto');
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
      alert(err instanceof Error ? err.message : 'No se pudo generar la descripción');
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
          salePrice: parseFloat(form.salePrice),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
          imageUrl: form.imageUrl || undefined,
          stockQty: form.stockQty || undefined,
          minStock: form.minStock || undefined,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al crear producto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.productsNew.emoji} title={PAGE.productsNew.title} subtitle={PAGE.productsNew.subtitle} />
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
            <button
              type="button"
              onClick={generateDescription}
              disabled={generating}
              className="btn-action btn-action-secondary text-xs disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? 'Generando...' : 'Generar con IA'}
            </button>
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio de venta">
            <input type="number" step="0.01" min={0} value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input" required />
          </FormField>
          <FormField label="Costo">
            <input type="number" step="0.01" min={0} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="input" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cantidad inicial en inventario">
            <QuantityStepper value={form.stockQty} onChange={(v) => setForm({ ...form, stockQty: v })} min={0} />
          </FormField>
          <FormField label="Stock mínimo (alerta)">
            <QuantityStepper value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} min={0} />
          </FormField>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Creando...' : 'Crear producto'}
        </button>
      </form>
    </DashboardLayout>
  );
}
