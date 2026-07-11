/** Prefijos RD (NANP +1) */
export const DR_AREA_CODES = ['809', '829', '849'] as const;

/** Normaliza teléfono para wa.me (solo dígitos, con código país) */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function isDominicanPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  if (n.length !== 11 || !n.startsWith('1')) return false;
  return (DR_AREA_CODES as readonly string[]).includes(n.slice(1, 4));
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const num = normalizePhone(phone);
  if (!num) return '';
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function orderRefShort(orderId: string) {
  return orderId.replace(/-/g, '').slice(0, 8).toLowerCase();
}

export function buildOrderMessage(opts: {
  buyerName: string;
  catalogName: string;
  items: Array<{ name: string; qty: number; lineTotal: number }>;
  total: number;
  orderId?: string;
  notes?: string;
  trackingUrl?: string;
}): string {
  const lines = opts.items.map(
    (i) => `• ${i.name} x${i.qty} — $${i.lineTotal.toFixed(2)}`,
  );
  const ref = opts.orderId ? orderRefShort(opts.orderId) : '';
  let msg = `¡Hola! Soy *${opts.buyerName}*.\n\nQuiero confirmar mi pedido en *${opts.catalogName}*:\n\n${lines.join('\n')}\n\n*Total: $${opts.total.toFixed(2)}*`;
  if (ref) msg += `\n\nRef: #${ref}`;
  if (opts.trackingUrl) msg += `\nSeguimiento: ${opts.trackingUrl}`;
  if (opts.notes) msg += `\n\nNotas: ${opts.notes}`;
  msg += '\n\n¡Gracias! Quedo atento/a.';
  return msg;
}

export function buildSellerNewOrderMessage(opts: {
  buyerName: string;
  buyerPhone: string;
  total: number;
  orderId: string;
  itemCount: number;
}): string {
  const ref = orderRefShort(opts.orderId);
  return `🛒 *Nuevo pedido Catagce*\n\nCliente: ${opts.buyerName}\nWhatsApp: ${opts.buyerPhone}\nProductos: ${opts.itemCount}\nTotal: $${opts.total.toFixed(2)}\nRef: #${ref}`;
}
