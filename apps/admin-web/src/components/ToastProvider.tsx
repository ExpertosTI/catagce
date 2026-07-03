'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_MS = 3500;

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />,
  error: <AlertCircle size={17} className="text-red-500 shrink-0" />,
  info: <Info size={17} className="text-blue-500 shrink-0" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-item">
            {ICONS[t.variant]}
            <span className="flex-1 min-w-0">{t.message}</span>
            <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}
