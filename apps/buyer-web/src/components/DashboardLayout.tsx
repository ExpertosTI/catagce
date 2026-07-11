'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutGrid, Package, FileOutput, Settings, LogOut, Warehouse,
  BookOpen, MessageCircle, Radio, Users,
} from 'lucide-react';
import { clearAuth } from '@/lib/api';
import { AiAssistant } from '@/components/AiAssistant';

/** Móvil: Pedidos / Inbox / Difusión primero al scrollear */
const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/orders', icon: FileOutput, label: 'Pedidos' },
  { href: '/dashboard/whatsapp', icon: MessageCircle, label: 'Inbox' },
  { href: '/dashboard/difusion', icon: Radio, label: 'Difusión' },
  { href: '/dashboard/catalogs', icon: BookOpen, label: 'Catálogos' },
  { href: '/dashboard/products', icon: LayoutGrid, label: 'Productos' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contactos' },
  { href: '/dashboard/inventory', icon: Warehouse, label: 'Inventario' },
  { href: '/dashboard/settings', icon: Settings, label: 'Config' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDifusion = pathname.startsWith('/dashboard/difusion');

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

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <div className="max-w-2xl mx-auto glass rounded-[1.5rem] px-1.5 py-1.5 shadow-2xl">
          <div className="flex items-stretch gap-0.5 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] min-h-[3.25rem] px-2 py-1.5 rounded-2xl snap-start shrink-0 transition-colors touch-manipulation ${
                    active ? 'text-[#FF8A00] bg-[#FF8A00]/10' : 'text-gray-500 active:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <AiAssistant />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
