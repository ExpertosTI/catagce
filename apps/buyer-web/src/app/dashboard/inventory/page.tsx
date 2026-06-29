'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch, getApiKey, getToken } from '@/lib/api';
import { Warehouse, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getApiKey() && !getToken()) { router.push('/login'); return; }
    Promise.all([
      apiFetch<any[]>('/inventory/levels'),
      apiFetch<any[]>('/inventory/movements'),
      apiFetch<any[]>('/inventory/low-stock'),
    ]).then(([l, m, ls]) => { setLevels(l); setMovements(m); setLowStock(ls); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <DashboardLayout><div className="text-center py-20 text-gray-400">Cargando inventario...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-8">Inventario</h2>

      {lowStock.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6 border border-yellow-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="text-sm text-yellow-400">{lowStock.length} productos con stock bajo</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Warehouse className="w-5 h-5 text-[#00D1FF]" /> Niveles de Stock</h3>
          <div className="space-y-2">
            {levels.map((l) => {
              const available = parseFloat(l.onHandBase) - parseFloat(l.reservedBase || '0');
              return (
                <div key={l.id} className="glass rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{l.product?.name}</p>
                    <p className="text-xs text-gray-500">{l.warehouse?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#00D1FF]">{available.toFixed(0)} disp.</p>
                    <p className="text-xs text-gray-500">Reservado: {l.reservedBase || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-4">Movimientos Recientes</h3>
          <div className="space-y-2">
            {movements.slice(0, 15).map((m) => (
              <div key={m.id} className="glass rounded-xl p-3 flex items-center gap-3 text-sm">
                {parseFloat(m.quantityBaseDelta) >= 0
                  ? <ArrowUp className="w-4 h-4 text-green-400" />
                  : <ArrowDown className="w-4 h-4 text-red-400" />}
                <div className="flex-1">
                  <p>{m.product?.name}</p>
                  <p className="text-xs text-gray-500">{m.movementType} · {m.reasonCode}</p>
                </div>
                <span className="font-mono text-xs">{m.quantityBaseDelta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
