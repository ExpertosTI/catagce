'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Package, User, BookOpen, LogOut, Truck, Home } from 'lucide-react';
import { clearAuth, getClient } from '../lib/api';

const nav = [
  { href: '/portal', label: 'Mi cuenta', icon: User },
  { href: '/portal/invoices', label: 'Mis facturas', icon: FileText },
  { href: '/portal/dispatches', label: 'Mis despachos', icon: Truck },
  { href: '/portal/pending', label: 'Mercancía pendiente', icon: Package },
  { href: '/catalogo/preventa-marzo-2026', label: 'Catálogo', icon: BookOpen },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const client = getClient<{ name?: string }>();

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-blue-700 font-bold">
              <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center text-sm">G</div>
              GHome
            </Link>
            <span className="text-slate-300">|</span>
            <p className="text-sm text-slate-600">Portal de <strong>{client?.name || 'Cliente'}</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-blue-700 flex items-center gap-1"><Home size={16} /> Inicio</Link>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto flex gap-8 px-6 py-8">
        <aside className="w-52 shrink-0 hidden md:block">
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-blue-700'
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
