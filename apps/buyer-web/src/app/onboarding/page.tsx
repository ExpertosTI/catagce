'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getApiKey, getToken, apiFetch } from '@/lib/api';
import { OnboardingChat } from '@/components/OnboardingChat';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getApiKey() && !getToken()) {
      router.push('/login');
      return;
    }
    apiFetch<{ completed: boolean }>('/sellers/onboarding')
      .then((o) => { if (o.completed) router.push('/dashboard'); })
      .catch(() => {});
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="p-6 border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00D1FF]/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00D1FF]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Configuración guiada</h1>
            <p className="text-xs text-gray-500">Asistente AI — deja tu tienda lista para WhatsApp</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex items-start justify-center">
        <OnboardingChat />
      </main>
    </div>
  );
}
