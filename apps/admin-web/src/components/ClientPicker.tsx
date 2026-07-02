'use client';

import { useMemo, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { QuickClientModal } from './QuickClientModal';

export type PickerClient = { id: string; name: string; code?: string; email?: string; phone?: string; taxId?: string };

type Props = {
  clients: PickerClient[];
  value: string;
  onChange: (id: string) => void;
  allowCreate?: boolean;
  onCreated?: (client: PickerClient) => void;
  emptyMessage?: string;
};

export function ClientPicker({
  clients, value, onChange, allowCreate = true, onCreated,
  emptyMessage = 'Busque y seleccione un cliente',
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const selected = clients.find((c) => c.id === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients
      .filter((c) =>
        c.name.toLowerCase().includes(q)
        || c.code?.toLowerCase().includes(q)
        || c.phone?.includes(q)
        || c.taxId?.includes(q))
      .slice(0, 8);
  }, [clients, query]);

  function pick(c: PickerClient) {
    onChange(c.id);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setQuery('');
  }

  function handleCreated(client: PickerClient) {
    onChange(client.id);
    onCreated?.(client);
    setShowModal(false);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      {selected && (
        <div className="line-item-card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{selected.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {selected.phone || 'Sin teléfono'}
              {selected.taxId ? ` · RNC ${selected.taxId}` : ''}
            </p>
          </div>
          <button type="button" onClick={clear} className="btn-icon-subtle" aria-label="Cambiar cliente">
            <X size={16} />
          </button>
        </div>
      )}

      {!selected && (
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar cliente por nombre, teléfono o código..."
            className="input-search"
          />
          {open && (
            <div className="product-picker-dropdown">
              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className="product-picker-result"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 text-sm font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.phone || '—'}{c.code ? ` · ${c.code}` : ''}
                    </p>
                  </div>
                </button>
              ))}
              {query.trim() && results.length === 0 && (
                <p className="text-sm text-slate-400 p-4 text-center">Sin resultados</p>
              )}
              {allowCreate && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); setShowModal(true); }}
                  className="product-picker-result text-blue-700 font-medium border-t border-slate-100"
                >
                  <UserPlus size={16} /> Crear cliente nuevo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!selected && clients.length === 0 && !open && (
        <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          {emptyMessage}
          {allowCreate && (
            <button type="button" onClick={() => setShowModal(true)} className="btn-subtle btn-subtle-primary mt-3 mx-auto">
              <UserPlus size={15} /> Crear primer cliente
            </button>
          )}
        </div>
      )}

      {allowCreate && (
        <QuickClientModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          initialName={query.trim()}
        />
      )}
    </div>
  );
}
