import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
};

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="executive-card p-10 sm:p-16 text-center text-slate-500">
      {Icon && <Icon size={40} className="mx-auto mb-3 text-slate-300" />}
      <p className="font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
      {action && (
        <Link href={action.href} className="btn-primary text-sm mt-4 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}
