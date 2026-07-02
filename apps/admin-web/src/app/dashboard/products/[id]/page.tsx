'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Plus, Minus } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ImageUploadField } from '../../../../components/ImageUploadField';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';

type Movement = {
  id: string;
  type: string;
  quantityChange: number;
  resultingQty: number;
  reason?: string | null;
  createdAt: string;
  warehouseName: string;
};

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  adjustment: 'Ajuste manual', import: 'Importación', dispatch: 'Despacho', return: 'Devolución', correction: 'Corrección',
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: '', costPrice: '', imageUrl: '', minStock: 0 });
  const [availableQty, setAvailableQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [adjustDirection, setAdjustDirection] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  function loadProduct() {
    return apiFetch<any>(`/products/${params.id}`).then((p) => {
      const stock = p.stock?.[0];
      setForm({
        sku: p.sku ?? '',
        name: p.name ?? '',
        description: p.description ?? '',
        salePrice: p.salePrice ?? '',
        costPrice: p.costPrice ?? '',
        imageUrl: p.media?.find((m: any) => m.isPrimary)?.url ?? p.media?.[0]?.url ?? '',
        minStock: p.minStock ?? 0,
      });
      setAvailableQty(stock?.availableQty ?? 0);
    });
  }

  function loadMovements() {
    return apiFetch<Movement[]>(`/products/${params.id}/stock-movements`).then(setMovements).catch(() => {});
  }

  useEffect(() => {
    Promise.all([loadProduct(), loadMovements()]).then(() => setReady(true)).catch(console.error);
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
          minStock: form.minStock,
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

  async function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setAdjustError('');
    if (!adjustQty || adjustQty <= 0) {
      setAdjustError('Ingrese una cantidad mayor a cero');
      return;
    }
    setAdjusting(true);
    try {
      const delta = adjustDirection === 'out' ? -adjustQty : adjustQty;
      await apiFetch(`/products/${params.id}/stock-adjustment`, {
        method: 'POST',
        body: JSON.stringify({ delta, reason: adjustReason || undefined }),
      });
      await Promise.all([loadProduct(), loadMovements()]);
      setAdjustQty(0);
      setAdjustReason('');
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'No se pudo aplicar el ajuste');
    } finally {
      setAdjusting(false);
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
      <PageHeader emoji={PAGE.productsEdit.emoji} title={PAGE.productsEdit.title} subtitle={PAGE.productsEdit.subtitle} />
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <form onSubmit={submit} className="form-card space-y-4">
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
          <FormField label="Stock mínimo (alerta de bajo inventario)">
            <QuantityStepper value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} min={0} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={remove} className="btn-secondary text-red-600 border-red-200 ml-auto">Eliminar producto</button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500">Inventario disponible</p>
                <p className={`text-3xl font-bold mt-1 ${availableQty <= form.minStock ? 'text-amber-600' : 'text-emerald-700'}`}>{availableQty}</p>
              </div>
              {availableQty <= form.minStock && (
                <span className="badge-amber">Bajo stock mínimo</span>
              )}
            </div>

            <form onSubmit={applyAdjustment} className="space-y-3 pt-4 border-t border-slate-100">
              <p className="form-label">Ajustar inventario</p>
              <SegmentedControl<'in' | 'out'>
                value={adjustDirection}
                onChange={setAdjustDirection}
                options={[
                  { value: 'in', label: 'Entrada (+)' },
                  { value: 'out', label: 'Salida (-)' },
                ]}
              />
              <div className="flex items-center gap-3">
                <QuantityStepper value={adjustQty} onChange={setAdjustQty} min={0} />
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input flex-1"
                  placeholder="Motivo (ej. conteo físico, daño, devolución)"
                />
              </div>
              {adjustError && <p className="text-sm text-red-600">{adjustError}</p>}
              <button type="submit" disabled={adjusting} className="btn-primary text-sm disabled:opacity-50">
                {adjustDirection === 'in' ? <Plus size={15} /> : <Minus size={15} />}
                {adjusting ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">Historial de movimientos</div>
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{MOVEMENT_TYPE_LABEL[m.type] ?? m.type}</span>
                    <span className={`font-bold ${m.quantityChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(m.createdAt).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })} · Resultante: {m.resultingQty}
                    {m.reason ? ` · ${m.reason}` : ''}
                  </p>
                </li>
              ))}
              {!movements.length && <li className="p-6 text-center text-slate-400 text-sm">Sin movimientos registrados</li>}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
