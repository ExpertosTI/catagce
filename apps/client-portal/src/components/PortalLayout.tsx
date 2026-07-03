'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Package, BookOpen, LogOut, Truck, Home, Menu, X } from 'lucide-react';
import { clearAuth, getClient, apiFetch } from '../lib/api';
import { NotificationBell } from './NotificationBell';
import { AiChatWidget } from './AiChatWidget';

const baseNav = [
  { href: '/portal/invoices', label: 'Mis facturas', icon: FileText },
  { href: '/portal/dispatches', label: 'Mis despachos', icon: Truck },
  { href: '/portal/pending', label: 'Mercancía pendiente', icon: Package },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [clientName, setClientName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null);

  useEffect(() => {
    setClientName(getClient<{ name?: string }>()?.name ?? null);
    apiFetch<{ slug: string } | null>('/portal/active-catalog').then((c) => setCatalogSlug(c?.slug ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function logout() {
    clearAuth();
    router.push('/login');
  }

  const nav = catalogSlug
    ? [...baseNav, { href: `/catalogo/${catalogSlug}`, label: 'Catálogo', icon: BookOpen }]
    : baseNav;

  const navLinks = (onNavigate?: () => void) => nav.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
            : 'text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm'
        }`}
      >
        <Icon size={18} /> {label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 transition"
              aria-label="Menú"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/" className="flex items-center gap-2 text-blue-700 font-bold shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-sm font-extrabold shadow-sm">G</div>
              <span className="hidden sm:inline">GHome</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <p className="text-xs sm:text-sm text-slate-600 truncate" suppressHydrationWarning>
              <span className="hidden sm:inline">Portal de </span><strong>{clientName ?? 'Cliente'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="text-sm text-slate-500 hover:text-blue-700 hidden sm:flex items-center gap-1.5 transition">
              <Home size={16} /> Inicio
            </Link>
            <NotificationBell />
            <button type="button" onClick={logout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 transition">
              <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden mt-3 pt-3 border-t border-slate-200 space-y-1 max-w-6xl mx-auto">
            {navLinks(() => setMenuOpen(false))}
          </nav>
        )}
      </header>

      <div className="max-w-6xl mx-auto flex gap-8 px-4 sm:px-6 py-6 sm:py-8">
        <aside className="w-52 shrink-0 hidden lg:block">
          <nav className="space-y-1 sticky top-24 card p-2">{navLinks()}</nav>
        </aside>
        <main className="flex-1 min-w-0 w-full">{children}</main>
      </div>
      <AiChatWidget />
    </div>
  );
}
