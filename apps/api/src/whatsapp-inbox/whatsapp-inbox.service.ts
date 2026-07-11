import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  catalogs,
  orders,
  products,
  whatsappLabels,
  whatsappMessageEvents,
  whatsappQuickReplies,
  whatsappTickets,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppConnectService } from '../whatsapp-connect/whatsapp-connect.service';
import { OrdersService } from '../orders/orders.service';
import { OrderWhatsAppSyncService } from '../common/services/order-whatsapp-sync.service';
import { normalizePhoneDigits } from '../common/utils/phone.util';
import { orderRef, signBuyerPrefill } from '../common/utils/signed-prefill';

const WEB_URL = (process.env.PUBLIC_WEB_URL || 'https://catagce.renace.tech').replace(/\/$/, '');

const DEFAULT_LABELS = [
  { name: 'Nuevo', color: '#00D1FF' },
  { name: 'Pedido', color: '#22c55e' },
  { name: 'Soporte', color: '#FF8A00' },
  { name: 'VIP', color: '#a855f7' },
];

const DEFAULT_QUICK_REPLIES = [
  { title: 'Pedido recibido', body: '✅ Pedido recibido. Lo estamos revisando y te confirmamos en breve.', shortcut: 'recibido' },
  { title: 'En camino', body: '🚚 Tu pedido ya está en camino. ¡Gracias por tu compra!', shortcut: 'camino' },
  { title: 'Pago pendiente', body: '💳 Quedamos pendientes de tu pago para confirmar el pedido. ¿Me confirmas el método?', shortcut: 'pago' },
];

function jidToPhone(remoteJid: string) {
  return normalizePhoneDigits(String(remoteJid || '').split('@')[0] || '');
}

function previewFromChat(chat: any) {
  const msg = chat?.lastMessage?.message || chat?.lastMessage || {};
  return (
    msg.conversation
    || msg.extendedTextMessage?.text
    || msg.imageMessage?.caption
    || msg.videoMessage?.caption
    || (msg.imageMessage ? '📷 Imagen' : '')
    || (msg.audioMessage ? '🎤 Audio' : '')
    || (msg.documentMessage ? '📎 Documento' : '')
    || '—'
  );
}

function previewFromMessage(message: any) {
  const msg = message?.message || message || {};
  return (
    msg.conversation
    || msg.extendedTextMessage?.text
    || msg.imageMessage?.caption
    || '📎 Mensaje'
  );
}

@Injectable()
export class WhatsAppInboxService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
    private connect: WhatsAppConnectService,
    private ordersService: OrdersService,
    private orderSync: OrderWhatsAppSyncService,
  ) {}

  private async sellerCreds(sellerId: string) {
    return this.connect.getCreds(sellerId);
  }

  async ensureDefaultLabels(sellerId: string) {
    const existing = await this.db.query.whatsappLabels.findMany({
      where: eq(whatsappLabels.sellerId, sellerId),
    });
    if (existing.length) return existing;

    const inserted = await this.db.insert(whatsappLabels).values(
      DEFAULT_LABELS.map((l, i) => ({ sellerId, ...l, sortOrder: i })),
    ).returning();
    return inserted;
  }

  async ensureDefaultQuickReplies(sellerId: string) {
    const existing = await this.db.query.whatsappQuickReplies.findMany({
      where: eq(whatsappQuickReplies.sellerId, sellerId),
    });
    if (existing.length) return existing;
    return this.db.insert(whatsappQuickReplies).values(
      DEFAULT_QUICK_REPLIES.map((r) => ({ sellerId, ...r })),
    ).returning();
  }

  async listLabels(sellerId: string) {
    await this.ensureDefaultLabels(sellerId);
    const local = await this.db.query.whatsappLabels.findMany({
      where: eq(whatsappLabels.sellerId, sellerId),
    });
    const creds = await this.sellerCreds(sellerId);
    const evolution = await this.whatsapp.findLabels(creds);
    return {
      local: local.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      evolution: evolution.ok ? evolution.labels : [],
      whatsappReady: Boolean(creds),
    };
  }

  async createLabel(sellerId: string, body: { name: string; color?: string }) {
    const [label] = await this.db.insert(whatsappLabels).values({
      sellerId,
      name: body.name.trim(),
      color: body.color || '#00D1FF',
    }).returning();
    return label;
  }

  async syncTickets(sellerId: string) {
    const creds = await this.sellerCreds(sellerId);
    const { chats, ok, error } = await this.whatsapp.findChats(creds);
    if (!ok) return { synced: 0, error };

    let synced = 0;
    for (const chat of chats) {
      const remoteJid = String(chat?.id || chat?.remoteJid || chat?.jid || '');
      if (!remoteJid || remoteJid.includes('@g.us')) continue;

      const phone = jidToPhone(remoteJid);
      if (!phone) continue;

      const contactName = chat?.name || chat?.pushName || chat?.notify || phone;
      const lastMessageAt = chat?.lastMessage?.messageTimestamp
        ? new Date(Number(chat.lastMessage.messageTimestamp) * 1000)
        : chat?.updatedAt
          ? new Date(chat.updatedAt)
          : new Date();

      const existing = await this.db.query.whatsappTickets.findFirst({
        where: and(eq(whatsappTickets.sellerId, sellerId), eq(whatsappTickets.remoteJid, remoteJid)),
      });

      if (existing) {
        await this.db.update(whatsappTickets).set({
          contactName,
          phone,
          lastMessageAt,
          lastMessagePreview: previewFromChat(chat).slice(0, 280),
          unreadCount: Number(chat?.unreadCount ?? chat?.unreadMessages ?? existing.unreadCount ?? 0),
          updatedAt: new Date(),
        }).where(eq(whatsappTickets.id, existing.id));
      } else {
        await this.db.insert(whatsappTickets).values({
          sellerId,
          remoteJid,
          phone,
          contactName,
          lastMessageAt,
          lastMessagePreview: previewFromChat(chat).slice(0, 280),
          unreadCount: Number(chat?.unreadCount ?? chat?.unreadMessages ?? 0),
          status: 'open',
        });
      }
      synced += 1;
    }

    return { synced, error: null };
  }

  async listTickets(sellerId: string, filters?: { status?: string; labelId?: string; withOrder?: boolean }) {
    const all = await this.db.query.whatsappTickets.findMany({
      where: eq(whatsappTickets.sellerId, sellerId),
    });

    let result = all;
    if (filters?.status) {
      result = result.filter((t: any) => t.status === filters.status);
    }
    if (filters?.labelId) {
      result = result.filter((t: any) => (t.labelIds || []).includes(filters.labelId));
    }

    const withOrders = await Promise.all(result.map(async (t: any) => {
      const order = await this.db.query.orders.findFirst({
        where: and(eq(orders.sellerId, sellerId), eq(orders.whatsappTicketId, t.id)),
      });
      return {
        ...t,
        linkedOrder: order
          ? {
              id: order.id,
              ref: orderRef(order.id),
              status: order.status,
              totalAmount: order.totalAmount,
              source: order.source,
            }
          : null,
      };
    }));

    // Por defecto (y con withOrder=true): solo chats con pedido vinculado
    const filtered = filters?.withOrder === false
      ? withOrders
      : withOrders.filter((t: any) => Boolean(t.linkedOrder));

    return filtered.sort((a: any, b: any) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }

  async getTicket(sellerId: string, id: string) {
    const ticket = await this.db.query.whatsappTickets.findFirst({
      where: and(eq(whatsappTickets.id, id), eq(whatsappTickets.sellerId, sellerId)),
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async getTicketOrder(sellerId: string, ticketId: string) {
    await this.getTicket(sellerId, ticketId);
    const order = await this.db.query.orders.findFirst({
      where: and(eq(orders.sellerId, sellerId), eq(orders.whatsappTicketId, ticketId)),
      with: { items: true },
    });
    if (!order) return { order: null };

    const items = [];
    for (const i of order.items || []) {
      let name = 'Producto';
      try {
        const product = await this.db.query.products.findFirst({
          where: eq(products.id, i.productId),
        });
        if (product?.name) name = product.name;
      } catch { /* ignore */ }
      items.push({
        id: i.id,
        name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      });
    }

    return {
      order: {
        id: order.id,
        ref: orderRef(order.id),
        status: order.status,
        totalAmount: order.totalAmount,
        source: order.source,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        items,
      },
    };
  }

  async getMessages(sellerId: string, ticketId: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const creds = await this.sellerCreds(sellerId);

    let normalized: Array<{ id?: string; fromMe: boolean; text: string; timestamp: Date | null }> = [];
    try {
      const { messages, ok } = await this.whatsapp.findMessages(ticket.remoteJid, creds);
      const list = ok && Array.isArray(messages) ? messages : [];
      normalized = list.map((m: any) => {
        const fromMe = Boolean(m?.key?.fromMe ?? m?.fromMe);
        const ts = m?.messageTimestamp || m?.message?.messageTimestamp;
        return {
          id: m?.key?.id || m?.id,
          fromMe,
          text: previewFromMessage(m),
          timestamp: ts ? new Date(Number(ts) * (String(ts).length > 10 ? 1 : 1000)) : null,
        };
      }).sort((a: any, b: any) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      });
    } catch (err: any) {
      console.warn('[whatsapp-inbox] findMessages failed', err?.message);
    }

    // Fallback: eventos guardados por webhook
    if (!normalized.length) {
      const events = await this.db.query.whatsappMessageEvents.findMany({
        where: and(
          eq(whatsappMessageEvents.sellerId, sellerId),
          eq(whatsappMessageEvents.ticketId, ticketId),
        ),
      });
      normalized = (events || [])
        .map((e: any) => ({
          id: e.evolutionMessageId || e.id,
          fromMe: e.direction === 'outbound',
          text: e.textPreview || '—',
          timestamp: e.createdAt ? new Date(e.createdAt) : null,
        }))
        .sort((a: any, b: any) => {
          const ta = a.timestamp ? a.timestamp.getTime() : 0;
          const tb = b.timestamp ? b.timestamp.getTime() : 0;
          return ta - tb;
        });
    }

    await this.db.update(whatsappTickets).set({ unreadCount: 0, updatedAt: new Date() })
      .where(eq(whatsappTickets.id, ticketId));

    let order = null;
    try {
      const res = await this.getTicketOrder(sellerId, ticketId);
      order = res.order;
    } catch (err: any) {
      console.warn('[whatsapp-inbox] getTicketOrder failed', err?.message);
    }

    return { ticket, messages: normalized, order };
  }

  async updateStatus(sellerId: string, ticketId: string, status: string) {
    const [updated] = await this.db.update(whatsappTickets).set({
      status,
      updatedAt: new Date(),
    }).where(and(eq(whatsappTickets.id, ticketId), eq(whatsappTickets.sellerId, sellerId))).returning();
    if (!updated) throw new NotFoundException('Ticket no encontrado');
    return updated;
  }

  async toggleLabel(sellerId: string, ticketId: string, labelId: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const label = await this.db.query.whatsappLabels.findFirst({
      where: and(eq(whatsappLabels.id, labelId), eq(whatsappLabels.sellerId, sellerId)),
    });
    if (!label) throw new NotFoundException('Etiqueta no encontrada');

    const current: string[] = Array.isArray(ticket.labelIds) ? [...ticket.labelIds] : [];
    const has = current.includes(labelId);
    const labelIds = has ? current.filter((id) => id !== labelId) : [...current, labelId];

    const creds = await this.sellerCreds(sellerId);
    if (label.evolutionLabelId) {
      await this.whatsapp.handleLabel(ticket.phone, label.evolutionLabelId, has ? 'remove' : 'add', creds);
    }

    const [updated] = await this.db.update(whatsappTickets).set({
      labelIds,
      updatedAt: new Date(),
    }).where(eq(whatsappTickets.id, ticketId)).returning();

    return updated;
  }

  async sendReply(sellerId: string, ticketId: string, text: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const creds = await this.sellerCreds(sellerId);
    const result = await this.whatsapp.sendText(ticket.phone, text, creds);
    if (!result.ok) return result;

    await this.db.update(whatsappTickets).set({
      lastMessageAt: new Date(),
      lastMessagePreview: text.slice(0, 280),
      status: ticket.status === 'closed' ? 'open' : ticket.status,
      updatedAt: new Date(),
    }).where(eq(whatsappTickets.id, ticketId));

    return { ok: true as const };
  }

  async updateLinkedOrderStatus(sellerId: string, ticketId: string, status: string, actorUserId?: string) {
    const { order } = await this.getTicketOrder(sellerId, ticketId);
    if (!order) throw new NotFoundException('Este chat no tiene pedido vinculado');
    return this.ordersService.updateStatus(order.id, sellerId, status, actorUserId);
  }

  async createReorderLink(sellerId: string, ticketId: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const catalog = await this.db.query.catalogs.findFirst({
      where: eq(catalogs.sellerId, sellerId),
      with: { publications: true },
    });
    if (!catalog) throw new NotFoundException('No hay catálogo para compartir');

    let token = catalog.publications?.find((p: any) => p.isActive)?.token
      || catalog.publications?.[0]?.token;
    if (!token) {
      throw new BadRequestException('Publica el catálogo antes de reenviar el enlace');
    }

    const prefill = signBuyerPrefill(ticket.phone, ticket.contactName || undefined);
    const link = `${WEB_URL}/order/${token}?src=wa&p=${encodeURIComponent(prefill)}`;
    const message =
      `¡Hola${ticket.contactName ? ` ${ticket.contactName}` : ''}! 👋\n\n` +
      `Aquí puedes ver el catálogo y hacer tu pedido:\n${link}\n\n` +
      `Al confirmar, queda registrado en nuestro sistema automáticamente.`;

    const creds = await this.sellerCreds(sellerId);
    const sent = await this.whatsapp.sendText(ticket.phone, message, creds);
    return { ok: sent.ok, link, error: sent.ok ? undefined : (sent as any).error };
  }

  /** Phase C: Gemini extracts draft order from recent chat text */
  async parseOrderFromChat(sellerId: string, ticketId: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new BadRequestException('GOOGLE_AI_API_KEY no configurada');

    const events = await this.db.query.whatsappMessageEvents.findMany({
      where: and(
        eq(whatsappMessageEvents.sellerId, sellerId),
        eq(whatsappMessageEvents.ticketId, ticketId),
      ),
    });
    const recent = (events || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .reverse()
      .map((e: any) => `${e.direction}: ${e.textPreview || ''}`)
      .join('\n');

    const productRows = await this.db.query.products.findMany({
      where: eq(products.sellerId, sellerId),
    });
    const catalog = productRows.slice(0, 80).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.b2bPrice || p.basePrice,
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash',
    });
    const prompt = `Eres un extractor de pedidos B2B. Del chat de WhatsApp, identifica productos y cantidades.
Responde SOLO JSON: {"items":[{"productId":"...","quantity":1}],"notes":"..."}
Si no hay pedido claro: {"items":[],"notes":"sin pedido"}

Productos disponibles:
${JSON.stringify(catalog)}

Chat:
${recent || ticket.lastMessagePreview || '(vacío)'}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text() || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: { items?: Array<{ productId: string; quantity: number }>; notes?: string } = {};
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new BadRequestException('No se pudo interpretar el pedido del chat');
    }

    const items = (parsed.items || []).filter((i) => i.productId && i.quantity > 0);
    if (!items.length) {
      return { ok: false, message: 'No detecté un pedido claro en el chat', draft: null };
    }

    let total = 0;
    const orderItemsData = [];
    for (const item of items) {
      const product = catalog.find((p: any) => p.id === item.productId)
        || productRows.find((p: any) => p.id === item.productId);
      if (!product) continue;
      const unitPrice = parseFloat(String(product.price || product.b2bPrice || product.basePrice || 0));
      total += unitPrice * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        quantity: String(item.quantity),
        unitPrice: String(unitPrice),
      });
    }
    if (!orderItemsData.length) {
      return { ok: false, message: 'Los productos detectados no coinciden con el catálogo', draft: null };
    }

    const order = await this.ordersService.create({
      sellerId,
      buyerName: ticket.contactName || ticket.phone,
      buyerPhone: ticket.phone,
      totalAmount: String(total.toFixed(2)),
      notes: parsed.notes || 'Borrador desde WhatsApp (IA)',
      source: 'whatsapp_chat',
      whatsappTicketId: ticket.id,
      status: 'draft_capture',
      items: orderItemsData,
    });

    await this.orderSync.tagPedidoLabel(sellerId, ticket.id);
    await this.orderSync.linkOrderToTicket(order.id, ticket.id);

    return {
      ok: true,
      draft: {
        ...order,
        ref: orderRef(order.id),
        status: 'draft_capture',
      },
      message: 'Borrador creado — revisa y confirma en Pedidos o aquí en Inbox',
    };
  }

  async listQuickReplies(sellerId: string) {
    await this.ensureDefaultQuickReplies(sellerId);
    return this.db.query.whatsappQuickReplies.findMany({
      where: eq(whatsappQuickReplies.sellerId, sellerId),
    });
  }

  async createQuickReply(sellerId: string, body: { title: string; body: string; shortcut?: string }) {
    const [reply] = await this.db.insert(whatsappQuickReplies).values({
      sellerId,
      title: body.title.trim(),
      body: body.body.trim(),
      shortcut: body.shortcut?.trim() || null,
    }).returning();
    return reply;
  }

  async deleteQuickReply(sellerId: string, id: string) {
    await this.db.delete(whatsappQuickReplies).where(
      and(eq(whatsappQuickReplies.id, id), eq(whatsappQuickReplies.sellerId, sellerId)),
    );
    return { ok: true };
  }
}
