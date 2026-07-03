'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Plus, Minus, ArrowLeft, Package, History, DollarSign, Banknote, ClipboardList } from 'lucide-react';
import DashboardLayout, { PageHeader, SectionTitle } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ImageUploadField } from '../../../../components/ImageUploadField';
import { QuantityStepper } from '../../../../components/QuantityStepper';
import { SegmentedControl } from '../../../../components/SegmentedControl';
import { CurrencyInput } from '../../../../components/CurrencyInput';
import { ReportTableCard } from '../../../../components/ReportTableCard';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { formatAmount, formatCurrency } from '../../../../lib/currency';
import { PAGE } from '../../../../lib/page-titles';
import { useAppDialog } from '../../../../components/AppDialogProvider';

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
  const { confirm, alert } = useAppDialog();
  const [form, setForm] = useState({ sku: '', name: '', description: '', salePrice: 0, costPrice: 0, imageUrl: '', minStock: 0 });
  const [saleDisplay, setSaleDisplay] = useState('');
  const [costDisplay, setCostDisplay] = useState('');
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
      const sale = parseFloat(p.salePrice ?? '0');
      const cost = parseFloat(p.costPrice ?? '0');
      setForm({
        sku: p.sku ?? '',
        name: p.name ?? '',
        description: p.description ?? '',
        salePrice: sale,
        costPrice: cost,
        imageUrl: p.media?.find((m: any) => m.isPrimary)?.url ?? p.media?.[0]?.url ?? '',
        minStock: p.minStock ?? 0,
      });
      setSaleDisplay(formatAmount(sale));
      setCostDisplay(cost ? formatAmount(cost) : '');
      setAvailableQty(stock?.availableQty ?? 0);
    });
  }

  function loadMovements() {
    return apiFetch<Movement[]>(`/products/${params.id}/stock-movements`).then(setMovements).catch(() => {});
  }

  useEffect(() => {
    Promise.all([loadProduct(), loadMovements()]).then(() => setReady(true)).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo generar la descripción', variant: 'error' });
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
          salePrice: form.salePrice,
          costPrice: form.costPrice || undefined,
          imageUrl: form.imageUrl || undefined,
          minStock: form.minStock,
        }),
      });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'Error al guardar', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: '¿Eliminar este producto del catálogo?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await apiFetch(`/products/${params.id}`, { method: 'DELETE' });
      router.push('/dashboard/products');
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo eliminar', variant: 'error' });
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

  const stockValue = availableQty * form.salePrice;
  const stockCost = availableQty * form.costPrice;

  if (!ready) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando producto..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link href="/dashboard/products" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a mercancía
      </Link>

      <PageHeader title={form.name || PAGE.productsEdit.title} subtitle={form.sku} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Disponible</p>
          <p className={`report-kpi-value ${availableQty <= form.minStock ? 'text-amber-600' : 'text-emerald-700'}`}>{availableQty}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><DollarSign size={14} /> Precio venta</p>
          <p className="report-kpi-value text-blue-700 text-lg">{formatCurrency(form.salePrice)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Package size={14} /> Valor en stock</p>
          <p className="report-kpi-value text-emerald-700 text-lg">{formatCurrency(stockValue)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Banknote size={14} /> Costo en stock</p>
          <p className="report-kpi-value text-slate-700 text-lg">{formatCurrency(stockCost)}</p>
        </div>
      </div>

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
          <FormField label="Stock mínimo (alerta)">
            <QuantityStepper value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} min={0} />
          </FormField>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={remove} className="action-chip !text-red-600 !border-red-200 hover:!bg-red-50 ml-auto">
              Eliminar
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="executive-card p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Package size={16} className="text-slate-500" />}>Ajustar inventario</SectionTitle>
              {availableQty <= form.minStock && <span className="badge-amber shrink-0">Bajo stock</span>}
            </div>

            <form onSubmit={applyAdjustment} className="space-y-3">
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
                  className="input flex-1 text-sm"
                  placeholder="Motivo (conteo, daño, devolución...)"
                />
              </div>
              {adjustError && <p className="text-sm text-red-600">{adjustError}</p>}
              <button type="submit" disabled={adjusting} className="btn-primary text-sm w-full disabled:opacity-50">
                {adjustDirection === 'in' ? <Plus size={15} /> : <Minus size={15} />}
                {adjusting ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </form>
          </div>

          <ReportTableCard icon={<ClipboardList size={16} className="text-slate-500" />} title="Historial de movimientos" subtitle={`${movements.length} movimientos`}>
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{MOVEMENT_TYPE_LABEL[m.type] ?? m.type}</span>
                    <span className={`font-bold tabular-nums ${m.quantityChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(m.createdAt).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}Queda: {m.resultingQty}
                    {m.reason ? ` · ${m.reason}` : ''}
                  </p>
                </li>
              ))}
              {!movements.length && (
                <li className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <History size={24} className="opacity-40" /> Sin movimientos registrados
                </li>
              )}
            </ul>
          </ReportTableCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
