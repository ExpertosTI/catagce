export const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'docena', label: 'Docena' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'par', label: 'Par' },
  { value: 'set', label: 'Set' },
  { value: 'pieza', label: 'Pieza' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'lb', label: 'Libra' },
] as const;

export function unitLabelText(value?: string | null) {
  if (!value) return 'Unidad';
  return UNIT_OPTIONS.find((u) => u.value === value)?.label ?? value;
}
