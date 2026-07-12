'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const LINKS = [
  { href: '/dashboard/platform/requests', label: 'Solicitudes' },
  { href: '/dashboard/platform/sellers', label: 'Sellers' },
  { href: '/dashboard/platform/plans', label: 'Planes' },
  { href: '/dashboard/platform/whatsapp', label: 'WhatsApp' },
  { href: '/dashboard/platform/encuesta', label: 'Encuesta' },
] as const;

export function PlatformNav({ active }: { active: (typeof LINKS)[number]['href'] }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    apiFetch<{ count: number }>('/platform/plan-requests/pending-count')
      .then((r) => setPending(r.count || 0))
      .catch(() => setPending(0));
  }, []);

  return (
    <div className="flex flex-wrap gap-2 mb-6 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg ${
            active === l.href ? 'bg-[#00D1FF]/20 text-[#00D1FF]' : 'bg-white/5 text-gray-300'
          }`}
        >
          {l.label}
          {l.href === '/dashboard/platform/requests' && pending > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[#FF8A00] text-black text-[10px] font-bold">
              {pending}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
