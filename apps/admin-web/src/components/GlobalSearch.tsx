'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Users, Package, FileText, ArrowRight, Loader2,
  FilePlus, Wallet, Truck, LayoutDashboard, BarChart3, Settings,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/currency';

type SearchClient = { id: string; name: string; code?: string; phone?: string };
type SearchProduct = { id: string; name: string; sku?: string; salePrice?: string };
type SearchInvoice = { id: string; reference: string; ncf?: string | null; clientName?: string; totalAmount?: string };

type ResultItem = {
  key: string;
  group: 'Acciones' | 'Páginas' | 'Clientes' | 'Productos' | 'Facturas';
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href: string;
};

const PAGES: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  { label: 'Panel', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Clientes', href: '/dashboard/clients', icon: <Users size={16} /> },
  { label: 'Mercancía', href: '/dashboard/products', icon: <Package size={16} /> },
  { label: 'Facturas', href: '/dashboard/invoices', icon: <FileText size={16} /> },
  { label: 'Pagos', href: '/dashboard/payments', icon: <Wallet size={16} /> },
  { label: 'Despachos', href: '/dashboard/dispatches', icon: <Truck size={16} /> },
  { label: 'Reportes', href: '/dashboard/reports', icon: <BarChart3 size={16} /> },
  { label: 'Ajustes', href: '/dashboard/settings', icon: <Settings size={16} /> },
];

const ACTIONS: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  { label: 'Nueva factura', href: '/dashboard/invoices/new', icon: <FilePlus size={16} /> },
  { label: 'Nuevo cliente', href: '/dashboard/clients/new', icon: <Users size={16} /> },
  { label: 'Nuevo producto', href: '/dashboard/products/new', icon: <Package size={16} /> },
  { label: 'Nuevo despacho', href: '/dashboard/dispatches/new', icon: <Truck size={16} /> },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [clients, setClients] = useState<SearchClient[]>([]);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [invoices, setInvoices] = useState<SearchInvoice[]>([]);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Atajo global Cmd+K / Ctrl+K + evento del botón de la barra lateral
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    }
    function onOpenEvent() { setOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('ghome:search', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ghome:search', onOpenEvent);
    };
  }, [close]);

  // Cargar datos una sola vez al abrir
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    Promise.all([
      apiFetch<SearchClient[]>('/clients').catch(() => []),
      apiFetch<SearchProduct[]>('/products').catch(() => []),
      apiFetch<SearchInvoice[]>('/invoices').catch(() => []),
    ])
      .then(([c, p, i]) => { setClients(c); setProducts(p); setInvoices(i); })
      .finally(() => setLoading(false));
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: ResultItem[] = [];

    if (!q) {
      for (const a of ACTIONS) {
        items.push({ key: `a-${a.href}`, group: 'Acciones', icon: a.icon, title: a.label, href: a.href });
      }
      for (const p of PAGES) {
        items.push({ key: `p-${p.href}`, group: 'Páginas', icon: p.icon, title: p.label, href: p.href });
      }
      return items;
    }

    for (const a of ACTIONS.filter((x) => x.label.toLowerCase().includes(q))) {
      items.push({ key: `a-${a.href}`, group: 'Acciones', icon: a.icon, title: a.label, href: a.href });
    }
    for (const p of PAGES.filter((x) => x.label.toLowerCase().includes(q))) {
      items.push({ key: `p-${p.href}`, group: 'Páginas', icon: p.icon, title: p.label, href: p.href });
    }
    for (const c of clients.filter((x) => x.name?.toLowerCase().includes(q) || x.code?.toLowerCase().includes(q) || x.phone?.includes(q)).slice(0, 5)) {
      items.push({
        key: `c-${c.id}`, group: 'Clientes', icon: <Users size={16} />,
        title: c.name, subtitle: c.code, href: `/dashboard/clients/${c.id}`,
      });
    }
    for (const p of products.filter((x) => x.name?.toLowerCase().includes(q) || x.sku?.toLowerCase().includes(q)).slice(0, 5)) {
      items.push({
        key: `pr-${p.id}`, group: 'Productos', icon: <Package size={16} />,
        title: p.name, subtitle: p.sku ? `${p.sku}${p.salePrice ? ` · ${formatCurrency(p.salePrice)}` : ''}` : undefined,
        href: `/dashboard/products/${p.id}`,
      });
    }
    for (const inv of invoices.filter((x) => x.reference?.toLowerCase().includes(q) || x.ncf?.toLowerCase().includes(q) || x.clientName?.toLowerCase().includes(q)).slice(0, 5)) {
      items.push({
        key: `i-${inv.id}`, group: 'Facturas', icon: <FileText size={16} />,
        title: inv.ncf ?? inv.reference,
        subtitle: `${inv.clientName ?? ''}${inv.totalAmount ? ` · ${formatCurrency(inv.totalAmount)}` : ''}`,
        href: `/dashboard/invoices/${inv.id}`,
      });
    }
    return items;
  }, [query, clients, products, invoices]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  function go(href: string) {
    close();
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].href);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  let lastGroup: string | null = null;

  return (
    <div className="modal-overlay !items-start pt-[12vh] z-[85]" role="dialog" aria-modal="true" onClick={close}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {loading ? <Loader2 size={18} className="text-blue-600 animate-spin shrink-0" /> : <Search size={18} className="text-slate-400 shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar clientes, productos, facturas o acciones..."
            className="flex-1 text-sm focus:outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && !loading && (
            <p className="text-sm text-slate-400 text-center py-8">Sin resultados para “{query}”</p>
          )}
          {results.map((r, idx) => {
            const showHeader = r.group !== lastGroup;
            lastGroup = r.group;
            return (
              <div key={r.key}>
                {showHeader && (
                  <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.group}</p>
                )}
                <button
                  type="button"
                  data-active={idx === activeIdx}
                  onClick={() => go(r.href)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    idx === activeIdx ? 'bg-blue-50 text-blue-900' : 'text-slate-700'
                  }`}
                >
                  <span className={idx === activeIdx ? 'text-blue-600' : 'text-slate-400'}>{r.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{r.title}</span>
                    {r.subtitle && <span className="block text-xs text-slate-400 truncate">{r.subtitle}</span>}
                  </span>
                  {idx === activeIdx && <ArrowRight size={14} className="text-blue-500 shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
          <span><kbd className="font-semibold">↑↓</kbd> navegar</span>
          <span><kbd className="font-semibold">Enter</kbd> abrir</span>
          <span className="ml-auto"><kbd className="font-semibold">⌘K</kbd> abrir/cerrar</span>
        </div>
      </div>
    </div>
  );
}

export function openGlobalSearch() {
  window.dispatchEvent(new Event('ghome:search'));
}

export function GlobalSearchTrigger() {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-blue-100/80 bg-white/5 hover:bg-white/10 hover:text-white transition"
    >
      <Search size={15} />
      Buscar...
      <kbd className="ml-auto text-[10px] font-semibold bg-white/10 rounded-md px-1.5 py-0.5">⌘K</kbd>
    </button>
  );
}
