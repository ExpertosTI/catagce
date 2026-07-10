'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Package, FileOutput, Settings, LogOut, Warehouse, BookOpen, MessageCircle, Radio, Users } from 'lucide-react';
import { clearAuth } from '@/lib/api';
import { AiAssistant } from '@/components/AiAssistant';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/products', icon: LayoutGrid, label: 'Productos' },
  { href: '/dashboard/catalogs', icon: BookOpen, label: 'Catálogos' },
  { href: '/dashboard/inventory', icon: Warehouse, label: 'Inventario' },
  { href: '/dashboard/orders', icon: FileOutput, label: 'Pedidos' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contactos' },
  { href: '/dashboard/whatsapp', icon: MessageCircle, label: 'Inbox' },
  { href: '/dashboard/difusion', icon: Radio, label: 'Difusión' },
  { href: '/dashboard/settings', icon: Settings, label: 'Config' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-28">
      <header className="flex items-center justify-between p-6 md:px-12 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Package className="text-black w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Catagce<span className="text-[#00D1FF]">.</span>
          </h1>
        </Link>
        <button
          onClick={() => { clearAuth(); window.location.href = '/login'; }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </header>

      <main className="px-6 md:px-12 py-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 z-40">
        <div className="max-w-xl mx-auto glass rounded-[2rem] px-4 py-3 flex justify-between items-center shadow-2xl">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-2 py-1 transition-colors ${
                  active ? 'text-[#FF8A00]' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AiAssistant />
    </div>
  );
}
