'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
};

type AlertOptions = {
  title?: string;
  message: string;
  variant?: 'error' | 'success' | 'info';
};

type DialogState =
  | ({ kind: 'confirm' } & ConfirmOptions & { resolve: (v: boolean) => void })
  | ({ kind: 'alert' } & AlertOptions & { resolve: () => void })
  | null;

type DialogContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions | string) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setDialog({ kind: 'confirm', ...opts, resolve });
  }), []);

  const alert = useCallback((opts: AlertOptions | string) => new Promise<void>((resolve) => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    setDialog({ kind: 'alert', ...normalized, resolve });
  }), []);

  function closeConfirm(result: boolean) {
    dialog?.kind === 'confirm' && dialog.resolve(result);
    setDialog(null);
  }

  function closeAlert() {
    dialog?.kind === 'alert' && dialog.resolve();
    setDialog(null);
  }

  const isDanger = dialog?.kind === 'confirm' && dialog.variant === 'danger';
  const alertVariant = dialog?.kind === 'alert' ? (dialog.variant ?? 'info') : 'info';

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div className="modal-overlay z-[80]" role="dialog" aria-modal="true">
          <div className="modal-panel animate-fade-in max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                dialog.kind === 'confirm'
                  ? isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                  : alertVariant === 'error' ? 'bg-red-100 text-red-600'
                    : alertVariant === 'success' ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-100 text-blue-700'
              }`}>
                {dialog.kind === 'confirm' && isDanger ? <AlertTriangle size={20} /> : dialog.kind === 'alert' && alertVariant === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">
                  {dialog.title ?? (dialog.kind === 'confirm' ? 'Confirmar acción' : 'Aviso')}
                </h3>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{dialog.message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {dialog.kind === 'confirm' ? (
                <>
                  <button type="button" onClick={() => closeConfirm(false)} className="btn-secondary flex-1">
                    {dialog.cancelLabel ?? 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeConfirm(true)}
                    className={`flex-1 font-medium px-5 py-2.5 rounded-xl text-white transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'btn-primary !w-auto'}`}
                  >
                    {dialog.confirmLabel ?? 'Confirmar'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={closeAlert} className="btn-primary w-full">
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      confirm: async () => false,
      alert: async () => {},
    };
  }
  return ctx;
}
