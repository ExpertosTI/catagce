'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingState } from '@/components/LoadingState';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  BarChart3, Mail, Lock, Receipt, TrendingUp, DollarSign, Plus,
} from 'lucide-react';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  credit: 'Crédito',
  other: 'Otro',
};

export default function AccountingPage() {
  const router = useRouter();
  const { ensureAuth, onApiError } = useRequireAuth();
  const [summary, setSummary] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showClosing, setShowClosing] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [cashCounted, setCashCounted] = useState('');
  const [expense, setExpense] = useState({ amount: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, c, e] = await Promise.all([
      apiFetch<any>(`/accounting/summary?from=${from}&to=${to}`),
      apiFetch<any[]>('/accounting/closings'),
      apiFetch<any[]>('/accounting/entries'),
    ]);
    setSummary(s);
    setClosings(c);
    setEntries(e);
  };

  useEffect(() => {
    if (!ensureAuth()) return;
    load()
      .catch((err) => { if (!onApiError(err)) setError(getErrorMessage(err)); })
      .finally(() => setLoading(false));
  }, [router, ensureAuth, onApiError]);

  const refresh = async () => {
    setLoading(true);
    try {
      await load();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async () => {
    setSaving(true);
    setMsg('');
    try {
      const r = await apiFetch<any>('/accounting/reports/email', {
        method: 'POST',
        body: JSON.stringify({ from, to }),
      });
      setMsg(r.sent ? 'Reporte enviado por correo' : 'Reporte guardado (configure SMTP para envío real)');
    } catch (err) {
      setMsg(getErrorMessage(err, 'No se pudo enviar'));
    } finally {
      setSaving(false);
    }
  };

  const createClosing = async () => {
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/accounting/closings', {
        method: 'POST',
        body: JSON.stringify({
          periodStart: from,
          periodEnd: to,
          cashCounted: cashCounted ? parseFloat(cashCounted) : undefined,
        }),
      });
      setMsg('Cierre de ventas registrado');
      setShowClosing(false);
      setCashCounted('');
      await load();
    } catch (err) {
      setMsg(getErrorMessage(err, 'Error al cerrar'));
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async () => {
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/accounting/entries', {
        method: 'POST',
        body: JSON.stringify({
          entryType: 'expense',
          amount: parseFloat(expense.amount),
          description: expense.description,
          paymentMethod: 'cash',
        }),
      });
      setMsg('Gasto registrado');
      setShowExpense(false);
      setExpense({ amount: '', description: '' });
      await load();
    } catch (err) {
      setMsg(getErrorMessage(err, 'Error al registrar gasto'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando contabilidad..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-[#00D1FF]" /> Contabilidad
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowExpense(true)} className="flex items-center gap-1 px-3 py-2 text-sm glass rounded-xl">
            <Plus className="w-4 h-4" /> Gasto
          </button>
          <button onClick={() => setShowClosing(true)} className="flex items-center gap-1 px-3 py-2 text-sm glass rounded-xl">
            <Lock className="w-4 h-4 text-[#FF8A00]" /> Cierre
          </button>
          <button onClick={sendReport} disabled={saving} className="flex items-center gap-1 px-3 py-2 text-sm bg-[#00D1FF]/20 text-[#00D1FF] rounded-xl">
            <Mail className="w-4 h-4" /> Enviar reporte
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-black/40 rounded-xl px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-black/40 rounded-xl px-3 py-2 text-sm" />
        <button onClick={refresh} className="px-4 py-2 text-sm glass rounded-xl">Actualizar</button>
      </div>

      {showClosing && (
        <div className="glass rounded-2xl p-6 mb-6 border border-[#FF8A00]/30">
          <h3 className="font-bold mb-4">Cierre de ventas — {from} a {to}</h3>
          <p className="text-sm text-gray-400 mb-4">
            Ventas confirmadas: {summary?.confirmedCount} · Bruto: ${summary?.grossSales}
          </p>
          <input
            type="number"
            placeholder="Efectivo contado en caja (opcional)"
            className="bg-black/40 rounded-xl px-4 py-3 text-sm w-full mb-4"
            value={cashCounted}
            onChange={(e) => setCashCounted(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={createClosing} disabled={saving} className="px-4 py-2 bg-[#FF8A00] text-black rounded-xl font-medium">
              Confirmar cierre
            </button>
            <button onClick={() => setShowClosing(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {showExpense && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-4">Registrar gasto</h3>
          <div className="grid gap-3">
            <input
              type="number"
              placeholder="Monto"
              className="bg-black/40 rounded-xl px-4 py-3 text-sm"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
            />
            <input
              placeholder="Descripción"
              className="bg-black/40 rounded-xl px-4 py-3 text-sm"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addExpense} disabled={saving} className="px-4 py-2 bg-[#00D1FF] text-black rounded-xl font-medium">Guardar</button>
            <button onClick={() => setShowExpense(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Ventas brutas', value: `$${summary.grossSales}`, icon: DollarSign, color: '#00D1FF' },
            { label: 'Neto', value: `$${summary.netSales}`, icon: TrendingUp, color: '#22c55e' },
            { label: 'ITBIS', value: `$${summary.taxAmount}`, icon: Receipt, color: '#888' },
            { label: 'Utilidad est.', value: `$${summary.profitEstimate}`, icon: BarChart3, color: '#FF8A00' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-4">
              <Icon className="w-5 h-5 mb-2" style={{ color }} />
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold mb-4">Top productos vendidos</h3>
          <div className="space-y-2">
            {(summary?.topProducts || []).map((p: any) => (
              <div key={p.productId} className="glass rounded-xl p-3 flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-[#00D1FF]">${p.revenue.toFixed(2)} ({p.qty.toFixed(0)} u.)</span>
              </div>
            ))}
            {!summary?.topProducts?.length && (
              <p className="text-gray-500 text-sm">Sin ventas en el período</p>
            )}
          </div>

          {summary?.byPayment && Object.keys(summary.byPayment).length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-4">Por método de pago</h3>
              {Object.entries(summary.byPayment).map(([k, v]) => (
                <div key={k} className="glass rounded-xl p-3 flex justify-between text-sm mb-2">
                  <span>{PAYMENT_LABELS[k] || k}</span>
                  <span>${(v as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold mb-4">Cierres recientes</h3>
          <div className="space-y-2 mb-6">
            {closings.slice(0, 5).map((c) => (
              <div key={c.id} className="glass rounded-xl p-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">
                    {new Date(c.periodStart).toLocaleDateString()} — {new Date(c.periodEnd).toLocaleDateString()}
                  </span>
                  <span className="text-[#00D1FF] font-bold">${c.grossSales}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {c.confirmedCount} ventas · Efectivo: ${c.cashTotal}
                  {c.variance && ` · Diferencia: $${c.variance}`}
                </p>
              </div>
            ))}
            {!closings.length && <p className="text-gray-500 text-sm">Aún no hay cierres</p>}
          </div>

          <h3 className="font-bold mb-4">Movimientos contables</h3>
          <div className="space-y-2">
            {entries.slice(0, 8).map((e) => (
              <div key={e.id} className="glass rounded-xl p-3 flex justify-between text-sm">
                <div>
                  <p>{e.description}</p>
                  <p className="text-xs text-gray-500">{e.entryType} · {new Date(e.entryDate).toLocaleDateString()}</p>
                </div>
                <span className={e.entryType === 'expense' ? 'text-red-400' : 'text-green-400'}>
                  {e.entryType === 'expense' ? '-' : '+'}${e.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
