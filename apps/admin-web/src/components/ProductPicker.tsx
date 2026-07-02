'use client';

import { useMemo, useState } from 'react';
import { Search, Trash2, Copy } from 'lucide-react';
import { QuantityStepper } from './QuantityStepper';
import { formatCurrency, formatAmountInput, parseAmount, formatAmount } from '../lib/currency';
import { UNIT_OPTIONS } from '../lib/units';

export type PickerProduct = { id: string; name: string; sku?: string; salePrice: string; imageUrl?: string; unit?: string };
export type PickedLine = {
  lineId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  unitLabel: string;
};

function newLineId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultUnitLabel(productUnit?: string) {
  if (!productUnit || productUnit === 'un') return 'unidad';
  return UNIT_OPTIONS.some((u) => u.value === productUnit) ? productUnit : 'unidad';
}

type Props = {
  products: PickerProduct[];
  lines: PickedLine[];
  onChange: (lines: PickedLine[]) => void;
  emptyMessage?: string;
  allowDuplicateProducts?: boolean;
};

export function ProductPicker({
  products,
  lines,
  onChange,
  emptyMessage = 'Busque y agregue productos',
  allowDuplicateProducts = true,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => allowDuplicateProducts || !lines.some((l) => l.productId === p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query, lines, allowDuplicateProducts]);

  function addProduct(p: PickerProduct) {
    onChange([...lines, {
      lineId: newLineId(),
      productId: p.id,
      quantity: 1,
      unitPrice: parseFloat(p.salePrice),
      unitLabel: defaultUnitLabel(p.unit),
    }]);
    setQuery('');
    setOpen(false);
  }

  function duplicateLine(line: PickedLine) {
    onChange([...lines, { ...line, lineId: newLineId() }]);
  }

  function updateLine(lineId: string, patch: Partial<PickedLine>) {
    onChange(lines.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)));
  }

  function removeLine(lineId: string) {
    onChange(lines.filter((l) => l.lineId !== lineId));
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar producto por nombre o SKU..."
          className="input-search"
        />
        {open && results.length > 0 && (
          <div className="product-picker-dropdown">
            {results.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addProduct(p)}
                className="product-picker-result"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku}</p>
                </div>
                <span className="text-sm font-semibold text-blue-700 shrink-0">{formatCurrency(p.salePrice)}</span>
              </button>
            ))}
          </div>
        )}
        {open && query.trim() && results.length === 0 && (
          <div className="product-picker-dropdown">
            <p className="text-sm text-slate-400 p-4 text-center">Sin resultados</p>
          </div>
        )}
      </div>

      {lines.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          {emptyMessage}
        </div>
      )}

      <div className="space-y-2">
        {lines.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          if (!product) return null;
          const lineTotal = line.quantity * line.unitPrice;
          return (
            <div key={line.lineId} className="line-item-card">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.sku}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {allowDuplicateProducts && (
                    <button
                      type="button"
                      onClick={() => duplicateLine(line)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Agregar otra línea con distinto precio"
                      aria-label="Duplicar línea"
                    >
                      <Copy size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLine(line.lineId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    aria-label="Quitar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(q) => updateLine(line.lineId, { quantity: q || 1 })}
                  min={1}
                  size="sm"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Unidad</span>
                  <select
                    value={line.unitLabel}
                    onChange={(e) => updateLine(line.lineId, { unitLabel: e.target.value })}
                    className="input !w-28 !py-1.5 text-sm"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Precio</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceDraft[line.lineId] ?? formatAmount(line.unitPrice)}
                    onChange={(e) => {
                      const display = formatAmountInput(e.target.value);
                      setPriceDraft((d) => ({ ...d, [line.lineId]: display }));
                      updateLine(line.lineId, { unitPrice: parseAmount(display) });
                    }}
                    onBlur={() => setPriceDraft((d) => {
                      const next = { ...d };
                      delete next[line.lineId];
                      return next;
                    })}
                    className="input !w-28 !py-1.5 text-sm tabular-nums"
                  />
                </div>
                <span className="font-bold text-blue-700 ml-auto">{formatCurrency(lineTotal)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
