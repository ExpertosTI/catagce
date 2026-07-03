import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

type Props = {
  emoji?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
};

export function EmptyState({ emoji, icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="executive-card p-10 sm:p-16 text-center text-slate-500">
      {Icon ? (
        <Icon size={40} className="mx-auto mb-3 text-slate-300" />
      ) : emoji ? (
        <p className="text-4xl mb-3" aria-hidden>{emoji}</p>
      ) : null}
      <p className="font-medium text-slate-700">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
      {action && (
        <Link href={action.href} className="btn-subtle btn-subtle-primary mt-4 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}
