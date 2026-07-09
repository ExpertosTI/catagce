import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { whatsappLabels, whatsappQuickReplies, whatsappTickets } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { normalizePhoneDigits } from '../common/utils/phone.util';

const DEFAULT_LABELS = [
  { name: 'Nuevo', color: '#00D1FF' },
  { name: 'Pedido', color: '#22c55e' },
  { name: 'Soporte', color: '#FF8A00' },
  { name: 'VIP', color: '#a855f7' },
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
  ) {}

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

  async listLabels(sellerId: string) {
    await this.ensureDefaultLabels(sellerId);
    const local = await this.db.query.whatsappLabels.findMany({
      where: eq(whatsappLabels.sellerId, sellerId),
    });
    const evolution = await this.whatsapp.findLabels();
    return {
      local: local.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      evolution: evolution.ok ? evolution.labels : [],
      whatsappReady: this.whatsapp.configured(),
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
    const { chats, ok, error } = await this.whatsapp.findChats();
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

  async listTickets(sellerId: string, filters?: { status?: string; labelId?: string }) {
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

    return result.sort((a: any, b: any) => {
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

  async getMessages(sellerId: string, ticketId: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const { messages, ok } = await this.whatsapp.findMessages(ticket.remoteJid);

    const normalized = (ok ? messages : []).map((m: any) => {
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

    await this.db.update(whatsappTickets).set({ unreadCount: 0, updatedAt: new Date() })
      .where(eq(whatsappTickets.id, ticketId));

    return { ticket, messages: normalized };
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

    if (label.evolutionLabelId) {
      await this.whatsapp.handleLabel(ticket.phone, label.evolutionLabelId, has ? 'remove' : 'add');
    }

    const [updated] = await this.db.update(whatsappTickets).set({
      labelIds,
      updatedAt: new Date(),
    }).where(eq(whatsappTickets.id, ticketId)).returning();

    return updated;
  }

  async sendReply(sellerId: string, ticketId: string, text: string) {
    const ticket = await this.getTicket(sellerId, ticketId);
    const result = await this.whatsapp.sendText(ticket.phone, text);
    if (!result.ok) return result;

    await this.db.update(whatsappTickets).set({
      lastMessageAt: new Date(),
      lastMessagePreview: text.slice(0, 280),
      status: ticket.status === 'closed' ? 'open' : ticket.status,
      updatedAt: new Date(),
    }).where(eq(whatsappTickets.id, ticketId));

    return { ok: true as const };
  }

  async listQuickReplies(sellerId: string) {
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
