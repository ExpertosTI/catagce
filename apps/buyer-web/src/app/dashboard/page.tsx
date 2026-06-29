'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, FileText, Link2, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch, getApiKey, getToken } from '@/lib/api';

export default function DashboardHome() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    if (!getApiKey() && !getToken()) { router.push('/login'); return; }

    Promise.all([
      apiFetch<any>('/analytics/dashboard'),
      apiFetch<any>('/sellers/me'),
      apiFetch<{ completed: boolean }>('/sellers/onboarding'),
    ]).then(([a, profile, onboarding]) => {
      if (!onboarding.completed) { router.push('/onboarding'); return; }
      setAnalytics(a);
      setSeller(profile);
    }).catch(() => router.push('/login'));
  }, [router]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Hola, {seller?.name || '...'}</h2>
        <p className="text-gray-400">Resumen de tu operación B2B</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Package />} label="Productos" value={analytics?.totalProducts ?? 0} color="#00D1FF" />
        <StatCard icon={<ShoppingCart />} label="Pedidos" value={analytics?.totalOrders ?? 0} color="#22c55e" />
        <StatCard icon={<DollarSign />} label="Ingresos" value={`$${analytics?.totalRevenue ?? '0'}`} color="#FF8A00" isText />
        <StatCard icon={<Users />} label="Compradores" value={analytics?.totalBuyers ?? 0} color="#a855f7" />
      </div>

      {analytics?.pendingOrders > 0 && (
        <Link href="/dashboard/orders" className="glass rounded-2xl p-4 mb-6 flex items-center gap-3 border border-[#00D1FF]/20 hover:border-[#00D1FF]/40 transition-colors">
          <AlertTriangle className="w-5 h-5 text-[#00D1FF]" />
          <span className="text-sm">{analytics.pendingOrders} pedidos pendientes de revisión</span>
        </Link>
      )}

      {analytics?.topProducts?.length > 0 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h3 className="font-bold mb-4">Productos más vistos</h3>
          <div className="space-y-3">
            {analytics.topProducts.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center text-sm">
                <span>{p.name}</span>
                <span className="text-gray-500">{p.views} vistas · ${p.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/catalogs" className="glass rounded-3xl p-6 hover:border-[#00D1FF]/30 transition-colors group">
          <Link2 className="w-8 h-8 text-[#00D1FF] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-2">Compartir Catálogo</h3>
          <p className="text-gray-400 text-sm">Enlaces para clientes sin registro.</p>
        </Link>
        <Link href="/dashboard/products/new" className="glass rounded-3xl p-6 hover:border-[#FF8A00]/30 transition-colors group">
          <Package className="w-8 h-8 text-[#FF8A00] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-2">Nuevo Producto</h3>
          <p className="text-gray-400 text-sm">Agrega productos a tu inventario.</p>
        </Link>
        <Link href="/dashboard/settings" className="glass rounded-3xl p-6 hover:border-green-500/30 transition-colors group">
          <TrendingUp className="w-8 h-8 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-2">Integraciones</h3>
          <p className="text-gray-400 text-sm">Odoo, Shopify, WooCommerce.</p>
        </Link>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color, isText }: { icon: React.ReactNode; label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className={`font-bold ${isText ? 'text-xl' : 'text-3xl'}`} style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
