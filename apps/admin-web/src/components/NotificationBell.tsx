'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, AlertTriangle, Clock, BellRing, Package, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

type Notification = {
  id: string;
  type: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  invoiceId?: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function notifIcon(type: string) {
  if (type.includes('overdue')) return { Icon: AlertTriangle, cls: 'notif-icon-danger' };
  if (type.includes('due_soon')) return { Icon: Clock, cls: 'notif-icon-warn' };
  if (type.includes('low_stock')) return { Icon: Package, cls: 'notif-icon-warn' };
  return { Icon: Bell, cls: 'notif-icon-info' };
}

function notifHref(n: Notification): string | null {
  if (n.type.includes('invoice') && n.invoiceId) return `/dashboard/invoices/${n.invoiceId}`;
  if (n.type === 'low_stock' && n.invoiceId) return `/dashboard/products/${n.invoiceId}`;
  return null;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function loadUnread() {
    apiFetch<number>('/notifications/unread-count').then(setUnread).catch(() => {});
  }

  function loadList() {
    return apiFetch<Notification[]>('/notifications').then(setNotifications).catch(() => {});
  }

  useEffect(() => {
    loadUnread();
    loadList();
    const interval = setInterval(() => {
      loadUnread();
      if (open) loadList();
    }, 30_000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle() {
    if (!open) loadList();
    setOpen((v) => !v);
  }

  async function handleClick(n: Notification) {
    if (!n.isRead) {
      await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
    const href = notifHref(n);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  async function markAllRead() {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function syncAlerts() {
    setSyncing(true);
    try {
      await apiFetch('/notifications/run-checks', { method: 'POST' });
      await Promise.all([loadList(), loadUnread()]);
    } catch { /* noop */ }
    finally { setSyncing(false); }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={toggle} className="notif-bell-btn" aria-label="Notificaciones">
        <Bell size={20} strokeWidth={2} />
        {unread > 0 && <span className="notif-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BellRing size={16} className="text-blue-600" />
              Notificaciones
              {unread > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{unread} nuevas</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={syncAlerts}
                disabled={syncing}
                className="text-xs text-slate-500 hover:text-blue-700 font-semibold flex items-center gap-1"
                title="Buscar alertas de vencimiento e inventario"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              </button>
              {unread > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs text-blue-700 font-semibold hover:underline">
                  Leído
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Bell size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Sin notificaciones</p>
                <p className="text-xs text-slate-400 mt-1">Vencimientos, cobros e inventario bajo</p>
                <button type="button" onClick={syncAlerts} disabled={syncing} className="report-toolbar-btn mt-4 mx-auto">
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Buscar alertas
                </button>
              </div>
            )}
            {notifications.map((n) => {
              const { Icon, cls } = notifIcon(n.type);
              const href = notifHref(n);
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`notif-item ${!n.isRead ? 'notif-item-unread' : ''}`}
                >
                  <div className={`notif-icon ${cls}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{n.subject}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium flex items-center gap-2">
                      {timeAgo(n.createdAt)}
                      {href && <span className="text-blue-600">Ver →</span>}
                    </p>
                  </div>
                  {!n.isRead ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1 shadow-sm" />
                  ) : (
                    <Check size={14} className="text-emerald-400 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
