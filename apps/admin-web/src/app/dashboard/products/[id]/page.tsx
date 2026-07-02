'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ImageUploadField } from '../../../../components/ImageUploadField';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { apiFetch } from '../../../../lib/api';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: '', costPrice: '', imageUrl: '', stockQty: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch<any>(`/products/${params.id}`).then((p) => {
      const stock = p.stock?.[0];
      setForm({
        sku: p.sku ?? '',
        name: p.name ?? '',
        description: p.description ?? '',
        salePrice: p.salePrice ?? '',
        costPrice: p.costPrice ?? '',
        imageUrl: p.media?.find((m: any) => m.isPrimary)?.url ?? p.media?.[0]?.url ?? '',
        stockQty: stock?.totalQty ?? 0,
      });
      setReady(true);
    }).catch(console.error);
  }, [params.id]);

  async function generateDescription() {
    if (!form.name.trim()) return;
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
      await apiFetch(`/products/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          description: form.description || undefined,
          salePrice: parseFloat(form.salePrice),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
          imageUrl: form.imageUrl || undefined,
          stockQty: form.stockQty,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await apiFetch(`/products/${params.id}`, { method: 'DELETE' });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
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
      <PageHeader title="Editar producto" subtitle="Modifique datos, precio e inventario" />
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        <ImageUploadField value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} label="Foto del producto" />

        <FormField label="Código SKU">
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" required />
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
        <FormField label="Cantidad en inventario">
          <QuantityStepper value={form.stockQty} onChange={(v) => setForm({ ...form, stockQty: v })} min={0} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={remove} className="btn-secondary text-red-600 border-red-200 ml-auto">Eliminar producto</button>
        </div>
      </form>
    </DashboardLayout>
  );
}
