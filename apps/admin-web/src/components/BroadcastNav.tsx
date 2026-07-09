'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/broadcast', label: 'Enviar', exact: true as const },
  { href: '/dashboard/broadcast/contacts', label: 'Contactos', exact: false as const },
  { href: '/dashboard/broadcast/lists', label: 'Listas', exact: false as const },
];

export function BroadcastNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 p-1 mb-4 bg-emerald-50 rounded-xl border border-emerald-100">
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
