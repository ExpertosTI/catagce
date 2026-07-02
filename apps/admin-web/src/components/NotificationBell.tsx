'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, AlertTriangle, Clock, BellRing } from 'lucide-react';
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function loadUnread() {
    apiFetch<number>('/notifications/unread-count').then(setUnread).catch(() => {});
  }

  function loadList() {
    apiFetch<Notification[]>('/notifications').then(setNotifications).catch(() => {});
  }

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="notif-bell-btn"
        aria-label="Notificaciones"
      >
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
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-blue-700 font-semibold hover:underline">
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Bell size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Sin notificaciones</p>
                <p className="text-xs text-slate-400 mt-1">Le avisaremos sobre vencimientos y cobros</p>
              </div>
            )}
            {notifications.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`notif-item ${!n.isRead ? 'notif-item-unread' : ''}`}
              >
                <div className={`notif-icon ${n.type.includes('overdue') ? 'notif-icon-danger' : n.type.includes('due_soon') ? 'notif-icon-warn' : 'notif-icon-info'}`}>
                  {n.type.includes('overdue') ? <AlertTriangle size={16} /> : <Clock size={16} />}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{n.subject}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1 shadow-sm" />
                ) : (
                  <Check size={14} className="text-emerald-400 shrink-0 mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
