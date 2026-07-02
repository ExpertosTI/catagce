'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, FileText, Truck, ShoppingBag,
  Ship, BookOpen, Settings, LogOut, Plus,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/api';
import { SITE_URL } from '../lib/site';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/products', label: 'Mercancía', icon: Package },
  { href: '/dashboard/invoices', label: 'Facturas', icon: FileText },
  { href: '/dashboard/dispatches', label: 'Despachos', icon: Truck },
  { href: '/dashboard/presales', label: 'Preventas', icon: ShoppingBag },
  { href: '/dashboard/imports', label: 'Importaciones', icon: Ship },
  { href: '/dashboard/catalogs', label: 'Catálogos', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser<{ name?: string }>();

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-60 bg-blue-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white text-blue-900 flex items-center justify-center font-bold">G</div>
            <div>
              <p className="font-bold text-sm">GHome Admin</p>
              <p className="text-xs text-blue-300">{user?.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active ? 'bg-white text-blue-900 font-medium' : 'text-blue-100 hover:bg-blue-800'
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-blue-800">
          <Link href={SITE_URL} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300 hover:text-white mb-1">
            Ver sitio público
          </Link>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white w-full">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-primary inline-flex items-center gap-2 text-sm">
      <Plus size={16} /> {label}
    </Link>
  );
}
