'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallAppBanner({ compact }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const dismissed = sessionStorage.getItem('catagce-install-dismissed');
    if (dismissed) return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (isStandalone || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem('catagce-install-dismissed', '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div
      className={`rounded-2xl border border-[#00D1FF]/30 bg-[#00D1FF]/10 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00D1FF] text-black flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Instalar Catagce</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            {iosHint
              ? 'En Safari: Compartir → “Añadir a pantalla de inicio”.'
              : 'Ábrela como app: Difusión, Pedidos e Inbox a un toque.'}
          </p>
          <div className="flex gap-2 mt-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="px-3 py-2 rounded-xl bg-[#00D1FF] text-black text-xs font-bold"
              >
                Instalar
              </button>
            )}
            <button type="button" onClick={dismiss} className="px-3 py-2 text-xs text-gray-500">
              Ahora no
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-gray-500 p-1" aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
