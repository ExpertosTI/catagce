'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Phone, User, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingState } from '@/components/LoadingState';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const statusLabels: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Nuevo', color: '#00D1FF' },
  confirmed: { label: 'Confirmado', color: '#22c55e' },
  rejected: { label: 'Rechazado', color: '#ef4444' },
  cancelled: { label: 'Cancelado', color: '#6b7280' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { ensureAuth, onApiError } = useRequireAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ensureAuth()) return;
    apiFetch<any[]>('/orders')
      .then(setOrders)
      .catch((err) => {
        if (!onApiError(err)) setError(getErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [router, ensureAuth, onApiError]);

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando pedidos..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-8">Pedidos</h2>
      {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

      <div className="space-y-4">
        {orders.map((order) => {
          const status = statusLabels[order.status] || { label: order.status, color: '#888' };
          return (
            <motion.div key={order.id} className="glass rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${status.color}20`, color: status.color }}
                    >
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">#{order.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.buyerName}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.buyerPhone}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-[#00D1FF]">${order.totalAmount}</p>
                  {order.buyerPhone && (
                    <a
                      href={buildWhatsAppUrl(order.buyerPhone, `Hola ${order.buyerName}, soy tu vendedor en Catagce. Recibí tu pedido #${order.id.slice(0, 8)} por $${order.totalAmount}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#25D366]/20 text-[#25D366] rounded-xl hover:bg-[#25D366]/30"
                      title="Contactar por WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  )}
                  {order.status === 'submitted' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, 'confirmed')}
                        className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'rejected')}
                        className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p>Los pedidos de tus clientes aparecerán aquí.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
