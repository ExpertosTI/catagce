'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, FileText, Truck, ShoppingBag,
  Ship, BookOpen, Settings, LogOut, Plus, Menu, X, Wallet, BarChart3,
  Search as SearchIcon,
} from 'lucide-react';
import { clearAuth, getUser, getToken } from '../lib/api';
import { SITE_URL } from '../lib/site';
import { NotificationBell } from './NotificationBell';
import { AiChatWidget } from './AiChatWidget';
import { GlobalSearch, GlobalSearchTrigger, openGlobalSearch } from './GlobalSearch';
import { ScrollTopButton } from './ScrollTopButton';
import { NAV_ITEMS } from '../lib/page-titles';

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/clients': Users,
  '/dashboard/products': Package,
  '/dashboard/invoices': FileText,
  '/dashboard/payments': Wallet,
  '/dashboard/dispatches': Truck,
  '/dashboard/presales': ShoppingBag,
  '/dashboard/imports': Ship,
  '/dashboard/catalogs': BookOpen,
  '/dashboard/reports': BarChart3,
  '/dashboard/settings': Settings,
};

const nav = NAV_ITEMS.map((item) => ({
  href: item.href,
  label: item.label,
  icon: NAV_ICONS[item.href] ?? LayoutDashboard,
}));

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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              active
                ? 'bg-white/95 text-blue-900 font-semibold shadow-md shadow-black/10'
                : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} className={active ? 'text-blue-700' : 'opacity-90'} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand({ userName }: { userName: string | null }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-blue-100 text-blue-900 flex items-center justify-center font-extrabold shrink-0 shadow-sm">
        G
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm tracking-tight">GHome Admin</p>
        <p className="text-xs text-blue-200/80 truncate" suppressHydrationWarning>
          {userName ?? 'Administrador'}
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUserName(getUser<{ name?: string }>()?.name ?? null);
  }, [router]);

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
  const sidebarClass = 'bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col';

  return (
    <div className="min-h-screen">
      <header className="flex lg:hidden sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white items-center justify-between px-4 py-3 shadow-lg shadow-blue-950/30">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition"
        >
          <Menu size={22} />
        </button>
        <p className="font-bold text-sm tracking-tight">GHome Admin</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Buscar"
            onClick={openGlobalSearch}
            className="p-2 rounded-xl hover:bg-white/10 transition"
          >
            <SearchIcon size={20} />
          </button>
          <NotificationBell />
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
            onClick={closeMenu}
          />
          <aside className={`fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] ${sidebarClass} lg:hidden animate-fade-in shadow-2xl`}>
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-2">
              <SidebarBrand userName={userName} />
              <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                <X size={20} />
              </button>
            </div>
            <SidebarNav pathname={pathname} onNavigate={closeMenu} />
            <div className="p-3 border-t border-white/10">
              <Link href={SITE_URL} onClick={closeMenu} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-200/80 hover:text-white mb-1 rounded-lg hover:bg-white/5 transition">
                Ver sitio público
              </Link>
              <button type="button" onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-100 hover:text-white w-full rounded-lg hover:bg-white/5 transition">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="flex min-h-[calc(100dvh-52px)] lg:min-h-screen">
        <aside className={`hidden lg:flex w-60 shrink-0 ${sidebarClass} shadow-xl shadow-blue-950/20`}>
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-2 justify-between">
              <SidebarBrand userName={userName} />
              <NotificationBell />
            </div>
            <div className="mt-4">
              <GlobalSearchTrigger />
            </div>
          </div>
          <SidebarNav pathname={pathname} />
          <div className="p-3 border-t border-white/10 mt-auto">
            <Link href={SITE_URL} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-200/80 hover:text-white mb-1 rounded-lg hover:bg-white/5 transition">
              Ver sitio público
            </Link>
            <button type="button" onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-100 hover:text-white w-full rounded-lg hover:bg-white/5 transition">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
      <GlobalSearch />
      <ScrollTopButton />
      <AiChatWidget />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1.5 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-primary inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
      <Plus size={16} />
      {label}
    </Link>
  );
}

export function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
      {icon}
      {children}
    </h2>
  );
}
