import Link from 'next/link';

type Props = {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
};

export function EmptyState({ emoji, title, subtitle, action }: Props) {
  return (
    <div className="executive-card p-10 sm:p-16 text-center text-slate-500">
      <p className="text-4xl mb-3" aria-hidden>{emoji}</p>
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
