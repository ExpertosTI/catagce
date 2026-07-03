'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Plus, Ship } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { ProductPicker, PickedLine, PickerProduct } from '../../../../components/ProductPicker';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { PAGE } from '../../../../lib/page-titles';

type Supplier = { id: string; name: string; country?: string };

export default function NewImportPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [reference, setReference] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [pageError, setPageError] = useState('');

  function loadSuppliers() {
    return apiFetch<Supplier[]>('/suppliers').then((s) => {
      setSuppliers(s);
      if (s.length && !supplierId) setSupplierId(s[0].id);
      return s;
    });
  }

  useEffect(() => {
    Promise.all([loadSuppliers(), apiFetch<PickerProduct[]>('/products')])
      .then(([, p]) => setProducts(p))
      .catch(() => setPageError('No se pudo cargar la información inicial'));
  }, []);

  async function createSupplier() {
    if (!newSupplierName.trim()) return;
    setSupplierError('');
    setCreatingSupplier(true);
    try {
      const supplier = await apiFetch<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name: newSupplierName }),
      });
      await loadSuppliers();
      setSupplierId(supplier.id);
      setNewSupplierName('');
      setShowSupplierForm(false);
    } catch (err: unknown) {
      setSupplierError(err instanceof Error ? err.message : 'No se pudo crear el proveedor');
    } finally {
      setCreatingSupplier(false);
    }
  }

  const totalCost = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPageError('');
    try {
      await apiFetch('/imports', {
        method: 'POST',
        body: JSON.stringify({
          reference,
          containerNumber: containerNumber || undefined,
          supplierId: supplierId || undefined,
          etaDate: etaDate || undefined,
          notes: notes || undefined,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitPrice),
          })),
        }),
      });
      router.push('/dashboard/imports');
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Error al registrar importación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <Link href="/dashboard/imports" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a importaciones
      </Link>
      <PageHeader emoji={PAGE.importsNew.emoji} title={PAGE.importsNew.title} subtitle={PAGE.importsNew.subtitle} />

      <form onSubmit={submit} className="form-card max-w-2xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Referencia">
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="input" required placeholder="IMP-2026-001" />
          </FormField>
          <FormField label="Número de contenedor">
            <input value={containerNumber} onChange={(e) => setContainerNumber(e.target.value)} className="input" placeholder="MSCU1234567" />
          </FormField>
        </div>

        <FormField label="Proveedor">
          {!showSupplierForm ? (
            <div className="flex gap-2">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input flex-1">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowSupplierForm(true)} className="btn-secondary shrink-0 px-3" title="Agregar proveedor">
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex gap-2">
                <input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="input flex-1"
                  placeholder="Nombre del proveedor"
                  autoFocus
                />
                <button type="button" onClick={createSupplier} disabled={creatingSupplier} className="btn-primary shrink-0 text-sm disabled:opacity-50">
                  {creatingSupplier ? 'Agregando...' : 'Agregar'}
                </button>
                <button type="button" onClick={() => { setShowSupplierForm(false); setSupplierError(''); }} className="btn-secondary shrink-0 text-sm">Cancelar</button>
              </div>
              {supplierError && <p className="text-sm text-red-600">{supplierError}</p>}
            </div>
          )}
        </FormField>

        <FormField label="Fecha estimada de llegada (ETA)">
          <input type="date" value={etaDate} onChange={(e) => setEtaDate(e.target.value)} className="input" />
        </FormField>

        <div>
          <p className="form-label">Mercancía en el contenedor</p>
          <ProductPicker products={products} lines={lines} onChange={setLines} emptyMessage="Busque y agregue productos al contenedor" />
        </div>

        <FormField label="Notas">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} placeholder="Observaciones del contenedor..." />
        </FormField>

        {lines.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="report-kpi">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Package size={14} /> Unidades
              </p>
              <p className="report-kpi-value text-slate-800 tabular-nums">{totalUnits}</p>
            </div>
            <div className="report-kpi border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Costo estimado</p>
              <p className="report-kpi-value text-blue-700">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        )}

        {pageError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{pageError}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 sm:flex-none sm:min-w-[120px]">Cancelar</button>
          <button type="submit" disabled={loading || !reference} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Ship size={16} />}
            {loading ? 'Registrando...' : 'Registrar importación'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
