import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  orders,
  sellerSettings,
  whatsappMessageEvents,
  whatsappTickets,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { OrderWhatsAppSyncService } from '../common/services/order-whatsapp-sync.service';
import { extractOrderRef } from '../common/utils/signed-prefill';
import { normalizePhoneDigits } from '../common/utils/phone.util';

@Injectable()
export class EvolutionWebhookService {
  private readonly log = new Logger(EvolutionWebhookService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
    private orderSync: OrderWhatsAppSyncService,
  ) {}

  async handle(payload: any) {
    const event = String(payload?.event || payload?.type || '').toLowerCase();
    const instance =
      payload?.instance
      || payload?.instanceName
      || payload?.data?.instance
      || payload?.sender
      || null;

    if (!instance) {
      return { ok: false, reason: 'no_instance' };
    }

    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.evolutionInstance, String(instance)),
    });
    if (!settings?.sellerId) {
      this.log.warn(`No seller for instance ${instance}`);
      return { ok: false, reason: 'unknown_instance' };
    }

    const sellerId = settings.sellerId;

    // Evolution v2 often sends MESSAGES_UPSERT
    if (event.includes('messages.upsert') || event.includes('messages_upsert') || event === 'messages.upsert') {
      return this.handleMessagesUpsert(sellerId, payload);
    }

    // Some payloads nest data differently
    if (payload?.data?.key || payload?.data?.message) {
      return this.handleMessagesUpsert(sellerId, payload);
    }

    return { ok: true, ignored: event || 'unknown' };
  }

  private async handleMessagesUpsert(sellerId: string, payload: any) {
    const data = payload?.data || payload;
    const messages = Array.isArray(data) ? data : [data];
    let processed = 0;

    for (const msg of messages) {
      const key = msg?.key || {};
      const remoteJid = String(key.remoteJid || msg?.remoteJid || '');
      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') continue;

      const fromMe = Boolean(key.fromMe ?? msg?.fromMe);
      const evolutionMessageId = String(key.id || msg?.id || '');
      const text = this.extractText(msg);
      const phone = normalizePhoneDigits(remoteJid.split('@')[0] || '');
      const pushName = msg?.pushName || msg?.notifyName || phone;

      const ticket = await this.orderSync.ensureTicket(sellerId, phone, pushName);
      if (!ticket) continue;

      // Idempotent event insert
      if (evolutionMessageId) {
        const existing = await this.db.query.whatsappMessageEvents.findFirst({
          where: and(
            eq(whatsappMessageEvents.sellerId, sellerId),
            eq(whatsappMessageEvents.evolutionMessageId, evolutionMessageId),
          ),
        });
        if (existing) continue;
      }

      let orderId: string | null = ticket ? null : null;
      const ref = extractOrderRef(text);
      if (ref) {
        const order = await this.orderSync.findOrderByRef(sellerId, ref);
        if (order) {
          orderId = order.id;
          await this.orderSync.linkOrderToTicket(order.id, ticket.id);
          await this.orderSync.tagPedidoLabel(sellerId, ticket.id);
          if (!order.whatsappTicketId) {
            await this.db.update(orders).set({
              whatsappTicketId: ticket.id,
              updatedAt: new Date(),
            }).where(eq(orders.id, order.id));
          }
        }
      }

      // Also check if ticket already has linked orders
      if (!orderId) {
        const linked = await this.db.query.orders.findFirst({
          where: and(eq(orders.sellerId, sellerId), eq(orders.whatsappTicketId, ticket.id)),
        });
        if (linked) orderId = linked.id;
      }

      await this.db.insert(whatsappMessageEvents).values({
        sellerId,
        ticketId: ticket.id,
        orderId,
        evolutionMessageId: evolutionMessageId || null,
        remoteJid,
        direction: fromMe ? 'outbound' : 'inbound',
        textPreview: (text || '').slice(0, 500),
        rawPayload: msg,
      }).catch((err: any) => {
        this.log.warn(`event insert failed: ${err?.message}`);
      });

      await this.db.update(whatsappTickets).set({
        lastMessageAt: new Date(),
        lastMessagePreview: (text || (fromMe ? '→' : '←')).slice(0, 280),
        unreadCount: fromMe ? ticket.unreadCount : (Number(ticket.unreadCount || 0) + 1),
        status: ticket.status === 'closed' && !fromMe ? 'open' : ticket.status,
        contactName: pushName || ticket.contactName,
        updatedAt: new Date(),
      }).where(eq(whatsappTickets.id, ticket.id));

      processed += 1;
    }

    return { ok: true, processed };
  }

  private extractText(msg: any): string {
    const m = msg?.message || msg || {};
    return (
      m.conversation
      || m.extendedTextMessage?.text
      || m.imageMessage?.caption
      || m.videoMessage?.caption
      || m.documentMessage?.caption
      || ''
    );
  }
}
