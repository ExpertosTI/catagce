'use client';

import { motion } from 'framer-motion';
import { Plus, Users, DollarSign, Filter, MoreHorizontal, Edit2, Box } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_BASE = 'https://api.catagce.renace.tech';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catagce_token');
}

export function TenantsView({ color, onCreate }: any) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/sellers`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load tenants', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administración de Tenants</h2>
          <p className="text-sm font-medium text-gray-400">Gestiona las cuentas de los vendedores</p>
        </div>
        <button 
          onClick={onCreate}
          className="px-6 py-3 bg-[#FACD01] text-black rounded-xl font-bold text-sm shadow-lg shadow-yellow-100 flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo Seller
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-4">
             <Users className="w-5 h-5" />
           </div>
           <p className="text-2xl font-bold">{tenants.length}</p>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sellers Activos</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500 mb-4">
             <DollarSign className="w-5 h-5" />
           </div>
           <p className="text-2xl font-bold">$125,430</p>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">GMV Total</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 mb-4">
             <Filter className="w-5 h-5" />
           </div>
           <p className="text-2xl font-bold">14</p>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nuevos hoy</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comercio</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-8 py-6 h-16 bg-gray-50/50" />
                </tr>
              ))
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold uppercase">PREMIUM</span>
                </td>
                <td className="px-8 py-6">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-green-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> ACTIVO
                  </span>
                </td>
                <td className="px-8 py-6">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
