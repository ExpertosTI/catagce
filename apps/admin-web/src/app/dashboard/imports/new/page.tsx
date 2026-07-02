'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
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
              <button type="button" onClick={() => setShowSupplierForm(true)} className="btn-secondary shrink-0 px-3">
                <Truck size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
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
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
        </FormField>

        {lines.length > 0 && (
          <div className="invoice-summary-footer">
            <div className="flex justify-between font-bold text-lg">
              <span>Costo total estimado</span>
              <span className="text-blue-700">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        )}

        {pageError && <p className="text-sm text-red-600">{pageError}</p>}

        <button type="submit" disabled={loading || !reference} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          {loading ? 'Registrando...' : 'Registrar importación'}
        </button>
      </form>
    </DashboardLayout>
  );
}
