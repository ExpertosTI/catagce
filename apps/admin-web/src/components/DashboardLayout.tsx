'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, FileText, Truck, ShoppingBag,
  Ship, BookOpen, Settings, LogOut, Plus, Menu, X,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/api';
import { SITE_URL } from '../lib/site';
import { NotificationBell } from './NotificationBell';
import { AiChatWidget } from './AiChatWidget';

const nav = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/products', label: 'Mercancía', icon: Package },
  { href: '/dashboard/invoices', label: 'Facturas', icon: FileText },
  { href: '/dashboard/dispatches', label: 'Despachos', icon: Truck },
  { href: '/dashboard/presales', label: 'Preventas', icon: ShoppingBag },
  { href: '/dashboard/imports', label: 'Importaciones', icon: Ship },
  { href: '/dashboard/catalogs', label: 'Catálogos', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              active ? 'bg-white text-blue-900 font-medium' : 'text-blue-100 hover:bg-blue-800'
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUserName(getUser<{ name?: string }>()?.name ?? null);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function logout() {
    clearAuth();
    router.push('/login');
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Móvil: barra superior */}
      <header className="flex lg:hidden sticky top-0 z-30 bg-blue-900 text-white items-center justify-between px-4 py-3 shadow">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-blue-800"
        >
          <Menu size={22} />
        </button>
        <p className="font-bold text-sm">GHome Admin</p>
        <NotificationBell />
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMenu}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] bg-blue-900 text-white flex flex-col lg:hidden animate-fade-in">
            <div className="p-5 border-b border-blue-800 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white text-blue-900 flex items-center justify-center font-bold shrink-0">G</div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">GHome Admin</p>
                  <p className="text-xs text-blue-300 truncate" suppressHydrationWarning>
                    {userName ?? 'Administrador'}
                  </p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="p-1 rounded hover:bg-blue-800">
                <X size={20} />
              </button>
            </div>
            <SidebarNav pathname={pathname} onNavigate={closeMenu} />
            <div className="p-3 border-t border-blue-800">
              <Link href={SITE_URL} onClick={closeMenu} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300 hover:text-white mb-1">
                Ver sitio público
              </Link>
              <button type="button" onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white w-full">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="flex min-h-[calc(100dvh-52px)] lg:min-h-screen">
        {/* Escritorio: sidebar fijo */}
        <aside className="hidden lg:flex w-60 bg-blue-900 text-white flex-col shrink-0">
          <div className="p-5 border-b border-blue-800">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white text-blue-900 flex items-center justify-center font-bold">G</div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">GHome Admin</p>
                  <p className="text-xs text-blue-300 truncate" suppressHydrationWarning>
                    {userName ?? 'Administrador'}
                  </p>
                </div>
              </div>
              <NotificationBell />
            </div>
          </div>
          <SidebarNav pathname={pathname} />
          <div className="p-3 border-t border-blue-800 mt-auto">
            <Link href={SITE_URL} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300 hover:text-white mb-1">
              Ver sitio público
            </Link>
            <button type="button" onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white w-full">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <AiChatWidget />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-primary inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
      <Plus size={16} /> {label}
    </Link>
  );
}
