'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Pencil, Trash2, Search, Printer, FileDown, AlertTriangle,
  Package, TrendingUp, DollarSign, Boxes,
} from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { PAGE } from '../../../lib/page-titles';
import { useAppDialog } from '../../../components/AppDialogProvider';
import { formatCurrency } from '../../../lib/currency';
import { exportCsv, printReportTable } from '../../../lib/report-utils';
import { useCompany } from '../../../lib/useCompany';

type Product = {
  id: string;
  sku: string;
  name: string;
  salePrice: string;
  costPrice?: string;
  minStock?: number;
  imageUrl?: string;
};

type InventoryRow = {
  productId: string;
  sku: string;
  name: string;
  availableQty: number;
  reservedQty: number;
  costPrice: string;
  salePrice: string;
  minStock: number;
  valuacionCosto: number;
  valuacionVenta: number;
  bajoStock: boolean;
};

type InventoryData = {
  products: InventoryRow[];
  totalValuacionCosto: number;
  totalValuacionVenta: number;
  lowStockCount: number;
};

export default function ProductsPage() {
  const company = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const { confirm, alert } = useAppDialog();

  const stockById = useMemo(() => {
    const map = new Map<string, InventoryRow>();
    for (const row of inventory?.products ?? []) map.set(row.productId, row);
    return map;
  }, [inventory]);

  function load() {
    setLoading(true);
    Promise.all([
      apiFetch<Product[]>('/products'),
      apiFetch<InventoryData>('/reports/inventory'),
    ])
      .then(([prods, inv]) => { setProducts(prods); setInventory(inv); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const stock = stockById.get(p.id);
      if (filterLow && !stock?.bajoStock) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, query, filterLow, stockById]);

  const totalUnits = inventory?.products.reduce((s, p) => s + p.availableQty, 0) ?? 0;

  function printInventory() {
    const rows = inventory?.products ?? [];
    printReportTable({
      title: 'Reporte de inventario',
      companyName: company?.name,
      subtitle: `${rows.length} productos · ${totalUnits} unidades disponibles`,
      meta: [
        { label: 'Valor compra', value: formatCurrency(inventory?.totalValuacionCosto ?? 0) },
        { label: 'Valor venta', value: formatCurrency(inventory?.totalValuacionVenta ?? 0) },
        { label: 'Bajo stock', value: String(inventory?.lowStockCount ?? 0) },
      ],
      columns: ['SKU', 'Producto', 'Disponible', 'Mínimo', 'Costo unit.', 'Venta unit.', 'Val. costo', 'Val. venta'],
      rows: rows.map((p) => [
        p.sku,
        p.name,
        p.availableQty,
        p.minStock,
        formatCurrency(p.costPrice),
        formatCurrency(p.salePrice),
        formatCurrency(p.valuacionCosto),
        formatCurrency(p.valuacionVenta),
      ]),
      totalsRow: ['', '', totalUnits, '', '', '', formatCurrency(inventory?.totalValuacionCosto ?? 0), formatCurrency(inventory?.totalValuacionVenta ?? 0)],
    });
  }

  function exportInventory() {
    const rows = inventory?.products ?? [];
    exportCsv('inventario-mercancia', ['SKU', 'Producto', 'Disponible', 'Reservado', 'Mínimo', 'Costo unit.', 'Venta unit.', 'Val. costo', 'Val. venta'],
      rows.map((p) => [
        p.sku, p.name, p.availableQty, p.reservedQty, p.minStock,
        parseFloat(p.costPrice || '0').toFixed(2),
        parseFloat(p.salePrice || '0').toFixed(2),
        p.valuacionCosto.toFixed(2),
        p.valuacionVenta.toFixed(2),
      ]));
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${name}"?\nEl producto se ocultará del catálogo.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      load();
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo eliminar', variant: 'error' });
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        emoji={PAGE.products.emoji}
        title={PAGE.products.title}
        subtitle={PAGE.products.subtitle}
        action={(
          <Link href="/dashboard/products/new" className="btn-primary text-sm">
            <Package size={16} /> Nuevo producto
          </Link>
        )}
      />

      {!loading && inventory && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Boxes size={14} /> Unidades</p>
            <p className="report-kpi-value text-slate-800">{totalUnits.toLocaleString('es-DO')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{products.length} productos</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><DollarSign size={14} /> Valor compra</p>
            <p className="report-kpi-value text-blue-700">{formatCurrency(inventory.totalValuacionCosto)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Costo en almacén</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><TrendingUp size={14} /> Valor venta</p>
            <p className="report-kpi-value text-emerald-700">{formatCurrency(inventory.totalValuacionVenta)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Precio al público</p>
          </div>
          <div className="report-kpi">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><AlertTriangle size={14} /> Bajo stock</p>
            <p className={`report-kpi-value ${inventory.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
              {inventory.lowStockCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Requieren atención</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="input-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterLow((v) => !v)}
            className={`report-toolbar-btn ${filterLow ? '!border-amber-400 !text-amber-700 !bg-amber-50' : ''}`}
          >
            <AlertTriangle size={14} /> Bajo stock
          </button>
          <button type="button" onClick={exportInventory} disabled={!inventory?.products.length} className="report-toolbar-btn disabled:opacity-40">
            <FileDown size={14} /> CSV
          </button>
          <button type="button" onClick={printInventory} disabled={!inventory?.products.length} className="report-toolbar-btn disabled:opacity-40">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Cargando mercancía..." />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Package}
          title={query || filterLow ? 'Sin resultados' : 'Sin productos'}
          subtitle={query || filterLow ? 'Pruebe otro filtro' : 'Agregue su primera mercancía'}
          action={!query && !filterLow ? { href: '/dashboard/products/new', label: 'Nuevo producto' } : undefined}
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const stock = stockById.get(p.id);
          const available = stock?.availableQty ?? 0;
          const bajoStock = stock?.bajoStock ?? false;
          return (
            <article key={p.id} className={`product-card group ${bajoStock ? 'ring-2 ring-amber-300/80' : ''}`}>
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={40} />
                  </div>
                )}
                {stock && (
                  <span className={`absolute top-2 right-2 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${
                    bajoStock ? 'bg-amber-500 text-white' : available > 0 ? 'bg-white/95 text-slate-700' : 'bg-red-500 text-white'
                  }`}>
                    {available} disp.
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 font-semibold tracking-wide">{p.sku}</p>
                <h3 className="font-bold text-slate-900 mt-0.5 line-clamp-2 leading-snug">{p.name}</h3>
                <div className="flex items-end justify-between gap-2 mt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Venta</p>
                    <p className="text-blue-700 font-extrabold text-lg tabular-nums">{formatCurrency(p.salePrice)}</p>
                  </div>
                  {(p.costPrice || stock?.costPrice) && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Costo</p>
                      <p className="text-slate-600 font-semibold text-sm tabular-nums">{formatCurrency(p.costPrice ?? stock?.costPrice ?? 0)}</p>
                    </div>
                  )}
                </div>
                {stock && stock.valuacionVenta > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    En stock: {formatCurrency(stock.valuacionCosto)} costo · {formatCurrency(stock.valuacionVenta)} venta
                  </p>
                )}
                <div className="flex gap-2 mt-4">
                  <Link href={`/dashboard/products/${p.id}`} className="action-chip action-chip-success flex-1 justify-center !py-2">
                    <Pencil size={15} /> <span className="!inline">Editar</span>
                  </Link>
                  <button type="button" onClick={() => remove(p.id, p.name)} className="action-chip !text-red-600 !border-red-200 hover:!bg-red-50 !py-2 !px-3">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
