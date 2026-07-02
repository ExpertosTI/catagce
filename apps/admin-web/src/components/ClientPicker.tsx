'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserPlus, Check, ChevronDown } from 'lucide-react';
import { QuickClientModal } from './QuickClientModal';

export type PickerClient = { id: string; name: string; code?: string; email?: string; phone?: string; taxId?: string };

type Props = {
  clients: PickerClient[];
  value: string;
  onChange: (id: string) => void;
  allowCreate?: boolean;
  onCreated?: (client: PickerClient) => void;
  placeholder?: string;
  emptyMessage?: string;
};

export function ClientPicker({
  clients, value, onChange, allowCreate = true, onCreated, placeholder = 'Buscar cliente por nombre o código...',
  emptyMessage = 'No hay clientes disponibles',
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, query]);

  function pick(c: PickerClient) {
    onChange(c.id);
    setQuery('');
    setOpen(false);
  }

  function handleCreated(client: PickerClient) {
    onChange(client.id);
    onCreated?.(client);
    setShowModal(false);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="input-search !pr-9 text-left flex items-center"
          >
            {selected ? (
              <span className="truncate">{selected.name}{selected.code ? ` (${selected.code})` : ''}</span>
            ) : (
              <span className="text-slate-400">{clients.length ? 'Seleccionar cliente...' : emptyMessage}</span>
            )}
          </button>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {allowCreate && (
          <button type="button" onClick={() => setShowModal(true)} className="btn-secondary shrink-0 px-3" title="Crear cliente nuevo">
            <UserPlus size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="product-picker-dropdown">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="input !py-2 text-sm"
            />
          </div>
          {results.length === 0 && (
            <p className="text-sm text-slate-400 p-4 text-center">Sin resultados</p>
          )}
          {results.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => pick(c)}
              className="product-picker-result"
            >
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-slate-400 truncate">{c.code}{c.email ? ` · ${c.email}` : ''}</p>
              </div>
              {c.id === value && <Check size={16} className="text-blue-700 shrink-0" />}
            </button>
          ))}
          {allowCreate && (
            <button
              type="button"
              onClick={() => { setOpen(false); setShowModal(true); }}
              className="product-picker-result text-blue-700 font-medium"
            >
              <UserPlus size={16} /> Crear cliente nuevo
            </button>
          )}
        </div>
      )}

      {allowCreate && (
        <QuickClientModal open={showModal} onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
