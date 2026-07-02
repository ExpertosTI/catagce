'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, AlertTriangle, Clock } from 'lucide-react';
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
    apiFetch<number>('/portal/notifications/unread-count').then(setUnread).catch(() => {});
  }

  function loadList() {
    apiFetch<Notification[]>('/portal/notifications').then(setNotifications).catch(() => {});
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
    await apiFetch(`/portal/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await apiFetch('/portal/notifications/read-all', { method: 'PATCH' });
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="text-slate-500 hover:text-blue-700 relative p-1.5 -m-1.5 rounded-lg hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-sm text-slate-900">Notificaciones</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-blue-700 font-medium hover:underline">
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">Sin notificaciones</p>
            )}
            {notifications.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`notif-item ${!n.isRead ? 'notif-item-unread' : ''}`}
              >
                <div className={`notif-icon ${n.type.includes('overdue') ? 'notif-icon-danger' : 'notif-icon-warn'}`}>
                  {n.type.includes('overdue') ? <AlertTriangle size={15} /> : <Clock size={15} />}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 truncate">{n.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />}
                {n.isRead && <Check size={14} className="text-slate-300 shrink-0 mt-1" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
