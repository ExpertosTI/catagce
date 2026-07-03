type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** KPIs + lista de tarjetas: patrón de las páginas de listado (facturas, clientes) */
export function ListPageSkeleton({ kpis = 4, rows = 4 }: { kpis?: number; rows?: number }) {
  return (
    <div className="animate-fade-in" role="status" aria-label="Cargando contenido">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: kpis }).map((_, i) => (
          <div key={i} className="report-kpi space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-full mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="executive-card space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-24 shrink-0" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cuadrícula de tarjetas de producto */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" role="status" aria-label="Cargando contenido">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="product-card">
          <Skeleton className="aspect-[4/3] !rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Panel principal del dashboard */
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in" role="status" aria-label="Cargando panel">
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl mb-5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
