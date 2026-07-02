/** Normaliza teléfono para wa.me (solo dígitos, con código país) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const num = normalizePhone(phone);
  if (!num) return '';
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(opts: {
  buyerName: string;
  catalogName: string;
  items: Array<{ name: string; qty: number; lineTotal: number }>;
  total: number;
  orderId?: string;
  notes?: string;
}): string {
  const lines = opts.items.map(
    (i) => `• ${i.name} x${i.qty} — $${i.lineTotal.toFixed(2)}`,
  );
  let msg = `¡Hola! Soy *${opts.buyerName}*.\n\nQuiero confirmar mi pedido en *${opts.catalogName}*:\n\n${lines.join('\n')}\n\n*Total: $${opts.total.toFixed(2)}*`;
  if (opts.orderId) msg += `\n\nRef: #${opts.orderId.slice(0, 8)}`;
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
  return `🛒 *Nuevo pedido Catagce*\n\nCliente: ${opts.buyerName}\nWhatsApp: ${opts.buyerPhone}\nProductos: ${opts.itemCount}\nTotal: $${opts.total.toFixed(2)}\nRef: #${opts.orderId.slice(0, 8)}`;
}
