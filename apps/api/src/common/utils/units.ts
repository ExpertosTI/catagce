const MULTIPLIERS: Record<string, number> = {
  unidad: 1,
  pieza: 1,
  par: 2,
  docena: 12,
  caja: 1,
  paquete: 1,
  set: 1,
  kg: 1,
  lb: 1,
};

const ALIASES: Record<string, string> = {
  un: 'unidad',
  'un.': 'unidad',
  und: 'unidad',
  u: 'unidad',
  dz: 'docena',
  dozen: 'docena',
};

export function normalizeUnitLabel(value?: string | null): string {
  if (!value?.trim()) return 'unidad';
  const key = value.trim().toLowerCase();
  return ALIASES[key] ?? (MULTIPLIERS[key] !== undefined ? key : 'unidad');
}

/** Convierte cantidad en unidad de factura a unidades base de inventario */
export function toBaseUnits(quantity: number, unitLabel?: string | null): number {
  const unit = normalizeUnitLabel(unitLabel);
  return Math.round(quantity * (MULTIPLIERS[unit] ?? 1));
}
