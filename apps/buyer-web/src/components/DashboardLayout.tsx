'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutGrid, Package, FileOutput, Settings, LogOut, Warehouse,
  BookOpen, MessageCircle, Radio, Users, MoreHorizontal, X,
} from 'lucide-react';
import { clearAuth } from '@/lib/api';
import { AiAssistant } from '@/components/AiAssistant';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

/** Siempre visibles en la barra (4 + Más) — sin scroll oculto */
const primaryNav: NavItem[] = [
  { href: '/dashboard/orders', icon: FileOutput, label: 'Pedidos' },
  { href: '/dashboard/whatsapp', icon: MessageCircle, label: 'Inbox' },
  { href: '/dashboard/difusion', icon: Radio, label: 'Difusión' },
  { href: '/dashboard/catalogs', icon: BookOpen, label: 'Catálogos' },
];

/** Resto en hoja «Más» */
const moreNav: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/products', icon: LayoutGrid, label: 'Productos' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contactos' },
  { href: '/dashboard/inventory', icon: Warehouse, label: 'Inventario' },
  { href: '/dashboard/settings', icon: Settings, label: 'Config' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDifusion = pathname.startsWith('/dashboard/difusion');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center shrink-0">
            <Package className="text-black w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight truncate">
            {isDifusion ? (
              <>Difusión<span className="text-[#25D366]">.</span></>
            ) : (
              <>Catagce<span className="text-[#00D1FF]">.</span></>
            )}
          </h1>
        </Link>
        <button
          type="button"
          onClick={() => { clearAuth(); window.location.href = '/login'; }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors p-2 -mr-2 min-h-[44px]"
          aria-label="Salir"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      <main className="px-3 sm:px-6 md:px-12 py-4 sm:py-8 max-w-3xl mx-auto w-full">{children}</main>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Cerrar menú"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Más opciones"
            className="relative z-10 glass rounded-t-[1.5rem] border border-white/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[70dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Más</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-gray-400 active:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreNav.map(({ href, icon: Icon, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] px-2 py-3 rounded-2xl touch-manipulation transition-colors ${
                      active ? 'text-[#FF8A00] bg-[#FF8A00]/15' : 'text-gray-300 bg-white/5 active:bg-white/10'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <div className="max-w-2xl mx-auto glass rounded-[1.5rem] px-1.5 py-1.5 shadow-2xl">
          <div className="flex items-stretch gap-0.5">
            {primaryNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.25rem] px-1 py-1.5 rounded-2xl transition-colors touch-manipulation ${
                    active ? 'text-[#FF8A00] bg-[#FF8A00]/10' : 'text-gray-500 active:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight truncate max-w-full">{label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.25rem] px-1 py-1.5 rounded-2xl transition-colors touch-manipulation ${
                moreOpen || moreActive ? 'text-[#FF8A00] bg-[#FF8A00]/10' : 'text-gray-500 active:text-white'
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">Más</span>
            </button>
          </div>
        </div>
      </nav>

      <AiAssistant hideFab={isDifusion} />
    </div>
  );
}
