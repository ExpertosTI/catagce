export const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'docena', label: 'Docena (12 u.)' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'par', label: 'Par (2 u.)' },
  { value: 'set', label: 'Set' },
  { value: 'pieza', label: 'Pieza' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'lb', label: 'Libra' },
] as const;

const MULTIPLIERS: Record<string, number> = {
  unidad: 1, pieza: 1, par: 2, docena: 12, caja: 1, paquete: 1, set: 1, kg: 1, lb: 1,
};

const ALIASES: Record<string, string> = {
  un: 'unidad', 'un.': 'unidad', und: 'unidad', u: 'unidad', dz: 'docena', dozen: 'docena',
};

export function normalizeUnitLabel(value?: string | null): string {
  if (!value?.trim()) return 'unidad';
  const key = value.trim().toLowerCase();
  return ALIASES[key] ?? (MULTIPLIERS[key] !== undefined ? key : 'unidad');
}

export function toBaseUnits(quantity: number, unitLabel?: string | null): number {
  const unit = normalizeUnitLabel(unitLabel);
  return Math.round(quantity * (MULTIPLIERS[unit] ?? 1));
}

export function unitLabelText(value?: string | null) {
  const normalized = normalizeUnitLabel(value);
  return UNIT_OPTIONS.find((u) => u.value === normalized)?.label ?? normalized;
}

export function unitConversionHint(quantity: number, unitLabel?: string | null): string | null {
  const unit = normalizeUnitLabel(unitLabel);
  const mult = MULTIPLIERS[unit] ?? 1;
  if (mult <= 1 || quantity <= 0) return null;
  const base = toBaseUnits(quantity, unit);
  return `${quantity} ${unitLabelText(unit).toLowerCase()} = ${base} unidades en inventario`;
}
