import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  orders,
  sellerSettings,
  whatsappLabels,
  whatsappTickets,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppConnectService } from '../whatsapp-connect/whatsapp-connect.service';
import { normalizePhoneDigits, isValidPhone } from './phone.util';
import { orderRef } from './signed-prefill';

const WEB_URL = (process.env.PUBLIC_WEB_URL || 'https://catagce.renace.tech').replace(/\/$/, '');

@Injectable()
export class OrderWhatsAppSyncService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
    private connect: WhatsAppConnectService,
  ) {}

  buildIdempotencyKey(token: string, phone: string, items: Array<{ productId: string; quantity: number | string }>) {
    const normalized = items
      .map((i) => `${i.productId}:${Number(i.quantity)}`)
      .sort()
      .join('|');
    return createHash('sha256')
      .update(`${token}|${normalizePhoneDigits(phone)}|${normalized}`)
      .digest('hex')
      .slice(0, 48);
  }

  async findRecentByIdempotency(sellerId: string, key: string) {
    if (!key) return null;
    const existing = await this.db.query.orders.findFirst({
      where: and(eq(orders.sellerId, sellerId), eq(orders.idempotencyKey, key)),
    });
    if (!existing) return null;
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age > 1000 * 60 * 60 * 6) return null; // 6h window
    return existing;
  }

  async ensureTicket(sellerId: string, phoneRaw: string, contactName?: string) {
    const phone = normalizePhoneDigits(phoneRaw);
    if (!isValidPhone(phone)) return null;
    const remoteJid = `${phone}@s.whatsapp.net`;

    const existing = await this.db.query.whatsappTickets.findFirst({
      where: and(eq(whatsappTickets.sellerId, sellerId), eq(whatsappTickets.remoteJid, remoteJid)),
    });
    if (existing) {
      await this.db.update(whatsappTickets).set({
        contactName: contactName || existing.contactName,
        phone,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        status: existing.status === 'closed' ? 'open' : existing.status,
      }).where(eq(whatsappTickets.id, existing.id));
      return existing;
    }

    const [ticket] = await this.db.insert(whatsappTickets).values({
      sellerId,
      remoteJid,
      phone,
      contactName: contactName || phone,
      status: 'open',
      lastMessageAt: new Date(),
      lastMessagePreview: 'Nuevo pedido desde catálogo',
      unreadCount: 1,
    }).returning();
    return ticket;
  }

  async tagPedidoLabel(sellerId: string, ticketId: string) {
    await this.ensurePedidoLabel(sellerId);
    const labels = await this.db.query.whatsappLabels.findMany({
      where: eq(whatsappLabels.sellerId, sellerId),
    });
    const pedido = labels.find((l: any) => String(l.name).toLowerCase() === 'pedido');
    if (!pedido) return;

    const ticket = await this.db.query.whatsappTickets.findFirst({
      where: eq(whatsappTickets.id, ticketId),
    });
    if (!ticket) return;
    const current: string[] = Array.isArray(ticket.labelIds) ? [...ticket.labelIds] : [];
    if (current.includes(pedido.id)) return;
    await this.db.update(whatsappTickets).set({
      labelIds: [...current, pedido.id],
      updatedAt: new Date(),
    }).where(eq(whatsappTickets.id, ticketId));
  }

  private async ensurePedidoLabel(sellerId: string) {
    const existing = await this.db.query.whatsappLabels.findFirst({
      where: and(eq(whatsappLabels.sellerId, sellerId), eq(whatsappLabels.name, 'Pedido')),
    });
    if (existing) return existing;
    const [label] = await this.db.insert(whatsappLabels).values({
      sellerId,
      name: 'Pedido',
      color: '#22c55e',
      sortOrder: 1,
    }).returning();
    return label;
  }

  async linkOrderToTicket(orderId: string, ticketId: string) {
    await this.db.update(orders).set({
      whatsappTicketId: ticketId,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));
  }

  async notifySellerNewOrder(opts: {
    sellerId: string;
    orderId: string;
    buyerName: string;
    buyerPhone: string;
    totalAmount: string;
    itemCount: number;
  }) {
    const creds = await this.connect.getCreds(opts.sellerId);
    if (!creds) return { ok: false as const, error: 'no_tenant_whatsapp' };

    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, opts.sellerId),
    });
    // Notify seller's own connected number if known; otherwise skip outbound-to-self
    const sellerPhone = settings?.evolutionPhone || settings?.whatsappNumber;
    const ref = orderRef(opts.orderId);
    const track = `${WEB_URL}/pedido/${opts.orderId}`;
    const text =
      `🛒 *Nuevo pedido Catagce*\n\n` +
      `Cliente: ${opts.buyerName}\n` +
      `WhatsApp: ${opts.buyerPhone}\n` +
      `Productos: ${opts.itemCount}\n` +
      `Total: $${opts.totalAmount}\n` +
      `Ref: #${ref}\n` +
      `Ver: ${track}`;

    // Update ticket preview for seller inbox
    const ticket = await this.ensureTicket(opts.sellerId, opts.buyerPhone, opts.buyerName);
    if (ticket) {
      await this.linkOrderToTicket(opts.orderId, ticket.id);
      await this.tagPedidoLabel(opts.sellerId, ticket.id);
      await this.db.update(whatsappTickets).set({
        lastMessagePreview: `Pedido #${ref} · $${opts.totalAmount}`,
        lastMessageAt: new Date(),
        unreadCount: sql`COALESCE(${whatsappTickets.unreadCount}, 0) + 1`,
        updatedAt: new Date(),
      }).where(eq(whatsappTickets.id, ticket.id));
    }

    // Optional: send confirmation to buyer from business WhatsApp
    const buyerSend = await this.whatsapp.sendText(
      opts.buyerPhone,
      `✅ Pedido recibido (*Ref: #${ref}*).\nTotal: $${opts.totalAmount}\nSeguimiento: ${track}\n\nTe contactamos por este chat.`,
      creds,
    );

    // If seller has a different notify number configured, ping it
    if (sellerPhone && normalizePhoneDigits(sellerPhone) !== normalizePhoneDigits(opts.buyerPhone)) {
      await this.whatsapp.sendText(sellerPhone, text, creds).catch(() => null);
    }

    return { ok: true as const, ticketId: ticket?.id || null, buyerNotified: buyerSend.ok, ref };
  }

  async findOrderByRef(sellerId: string, ref: string) {
    const needle = ref.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 8);
    if (needle.length < 8) return null;
    const all = await this.db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      with: { items: true },
    });
    return all.find((o: any) => orderRef(o.id) === needle) || null;
  }

  trackingUrl(orderId: string) {
    return `${WEB_URL}/pedido/${orderId}`;
  }
}
