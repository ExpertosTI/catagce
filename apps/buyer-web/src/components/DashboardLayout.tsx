'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutGrid, Package, FileOutput, Settings, LogOut, Warehouse,
  BookOpen, MessageCircle, Radio, Users,
} from 'lucide-react';
import { clearAuth } from '@/lib/api';
import { AiAssistant } from '@/components/AiAssistant';

/** Orden pensado para móvil: Pedidos / Inbox / Difusión siempre a la vista al scrollear */
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
      <header className="flex items-center justify-between p-4 sm:p-6 md:px-12 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Package className="text-black w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Catagce<span className="text-[#00D1FF]">.</span>
          </h1>
        </Link>
        <button
          type="button"
          onClick={() => { clearAuth(); window.location.href = '/login'; }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </header>

      <main className="px-4 sm:px-6 md:px-12 py-6 sm:py-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 p-3 z-40 safe-area-pb">
        <div className="max-w-2xl mx-auto glass rounded-[1.75rem] px-2 py-2 shadow-2xl">
          <div className="flex items-stretch gap-0.5 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[4.25rem] px-2 py-2 rounded-2xl snap-start shrink-0 transition-colors ${
                    active ? 'text-[#FF8A00] bg-[#FF8A00]/10' : 'text-gray-500 hover:text-white'
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
