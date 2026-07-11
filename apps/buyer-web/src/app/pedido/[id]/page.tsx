'use client';

import { useEffect, useState } from 'react';
import { publicFetch } from '@/lib/api';

export default function PedidoTrackingPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    publicFetch(`/public/orders/${params.id}`)
      .then(setOrder)
      .catch(() => setError('Pedido no encontrado'));
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p className="text-gray-400">Cargando pedido…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Seguimiento</p>
          <h1 className="text-2xl font-bold mt-1">Pedido #{order.ref}</h1>
          <p className="text-sm text-gray-400 mt-1">{order.catalogName}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estado</span>
            <span className="font-semibold text-[#00D1FF]">{order.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cliente</span>
            <span>{order.buyerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Canal</span>
            <span>{order.source || 'web'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total</span>
            <span className="font-bold">${Number(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Productos</h2>
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm border-b border-white/5 py-2">
              <span>{item.name} × {item.quantity}</span>
              <span className="text-gray-400">${Number(item.unitPrice || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
