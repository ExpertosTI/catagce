import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import {
  catalogs, clients, companies, orderRequestItems, orderRequests,
  presaleItems, presales, products,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { formatCurrency } from '../common/format-currency';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppService } from './whatsapp.service';

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://generalhome.tech').replace(/\/$/, '');
}

@Injectable()
export class CommerceNotifyService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
    private notifications: NotificationsService,
  ) {}

  private async companyName(companyId: string) {
    const [row] = await this.db.select({ name: companies.name, slug: companies.slug })
      .from(companies).where(eq(companies.id, companyId)).limit(1);
    return row?.name || 'GHome';
  }

  private catalogUrl(slug: string) {
    return `${siteUrl()}/catalogo/${slug}`;
  }

  async shareCatalog(companyId: string, catalogId: string, toPhone: string, recipientName?: string) {
    const [catalog] = await this.db.select().from(catalogs)
      .where(and(eq(catalogs.id, catalogId), eq(catalogs.companyId, companyId))).limit(1);
    if (!catalog) return { ok: false, error: 'catalog_not_found' };

    const company = await this.companyName(companyId);
    const url = this.catalogUrl(catalog.slug);
    const hello = recipientName ? `Hola ${recipientName}` : 'Hola';
    const text = [
      `📦 *${company}*`,
      '',
      `${hello}, te compartimos nuestro catálogo:`,
      `*${catalog.name}*`,
      catalog.description ? `\n${catalog.description}` : '',
      '',
      `👉 ${url}`,
      '',
      'Haz tu pedido en línea o escríbenos por aquí.',
    ].filter(Boolean).join('\n');

    const wa = await this.whatsapp.sendText(toPhone, text);
    return { ok: wa.ok, url, error: wa.ok ? undefined : wa.error };
  }

  async notifyPresaleCreated(companyId: string, presaleId: string) {
    const detail = await this.loadPresale(companyId, presaleId);
    if (!detail) return;

    const company = await this.companyName(companyId);
    const lines = detail.items.map((i: { productName: string; quantity: number; lineTotal: string }) => `• ${i.productName} x${i.quantity} — ${formatCurrency(parseFloat(i.lineTotal))}`);
    const total = formatCurrency(parseFloat(detail.totalAmount));

    const adminText = [
      `🛒 *Nuevo pedido · ${company}*`,
      '',
      `Ref: *${detail.reference}*`,
      `Cliente: ${detail.clientName}`,
      detail.clientPhone ? `WhatsApp: ${detail.clientPhone}` : '',
      detail.catalogName ? `Catálogo: ${detail.catalogName}` : '',
      '',
      ...lines,
      '',
      `*Total: ${total}*`,
      detail.notes ? `\nNotas: ${detail.notes}` : '',
    ].filter(Boolean).join('\n');

    const clientText = [
      `✅ *${company}*`,
      '',
      `Recibimos tu pedido *${detail.reference}*.`,
      '',
      ...lines,
      '',
      `*Total: ${total}*`,
      '',
      'Te contactaremos pronto para confirmar disponibilidad y entrega.',
    ].join('\n');

    await this.notifications.create({
      companyId,
      audience: 'staff',
      type: 'presale_created',
      title: `Nuevo pedido ${detail.reference}`,
      body: `${detail.clientName} — ${total}`,
    });

    await this.notifications.create({
      companyId,
      audience: 'client',
      clientId: detail.clientId,
      type: 'presale_created',
      title: 'Pedido recibido',
      body: `Tu pedido ${detail.reference} fue registrado (${total}).`,
    });

    void this.whatsapp.sendAdmin(companyId, adminText);
    if (detail.clientPhone) void this.whatsapp.sendText(detail.clientPhone, clientText);
  }

  async notifyPresaleStatus(companyId: string, presaleId: string, status: 'confirmed' | 'cancelled') {
    const detail = await this.loadPresale(companyId, presaleId);
    if (!detail?.clientPhone) return;

    const company = await this.companyName(companyId);
    const text = status === 'confirmed'
      ? [
        `✅ *${company}*`,
        '',
        `Tu pedido *${detail.reference}* fue *confirmado*.`,
        `Total: ${formatCurrency(parseFloat(detail.totalAmount))}`,
        '',
        'Pronto te indicamos los pasos de pago y entrega.',
      ].join('\n')
      : [
        `ℹ️ *${company}*`,
        '',
        `Tu pedido *${detail.reference}* fue *cancelado*.`,
        'Si tienes dudas, escríbenos por aquí.',
      ].join('\n');

    await this.notifications.create({
      companyId,
      audience: 'client',
      clientId: detail.clientId,
      type: `presale_${status}`,
      title: status === 'confirmed' ? 'Pedido confirmado' : 'Pedido cancelado',
      body: `Pedido ${detail.reference}`,
    });

    void this.whatsapp.sendText(detail.clientPhone, text);
  }

  async notifyOrderRequestCreated(companyId: string, orderId: string) {
    const detail = await this.loadOrderRequest(companyId, orderId);
    if (!detail) return;

    const company = await this.companyName(companyId);
    const lines = detail.items.map((i: { name: string; quantity: number }) => `• ${i.name} x${i.quantity}`);

    const adminText = [
      `📱 *Nuevo pedido móvil · ${company}*`,
      '',
      `Ref: *${detail.reference}*`,
      `Cliente: ${detail.clientName}`,
      detail.clientPhone ? `WhatsApp: ${detail.clientPhone}` : '',
      '',
      ...lines,
      '',
      'Adjudique precios en el panel admin.',
    ].filter(Boolean).join('\n');

    const clientText = [
      `✅ *${company}*`,
      '',
      `Recibimos tu solicitud *${detail.reference}*.`,
      '',
      ...lines,
      '',
      'Te enviaremos los precios por WhatsApp en breve.',
    ].join('\n');

    await this.notifications.create({
      companyId,
      audience: 'staff',
      type: 'order_request_created',
      title: `Pedido móvil ${detail.reference}`,
      body: detail.clientName,
    });

    void this.whatsapp.sendAdmin(companyId, adminText);
    if (detail.clientPhone) void this.whatsapp.sendText(detail.clientPhone, clientText);
  }

  async notifyOrderPriced(companyId: string, orderId: string, confirmed: boolean) {
    const detail = await this.loadOrderRequest(companyId, orderId);
    if (!detail?.clientPhone) return;

    const company = await this.companyName(companyId);
    const lines = detail.items.map((i: { name: string; quantity: number; unitPrice: string | null; lineTotal: string | null }) => {
      const price = i.unitPrice ? ` — ${formatCurrency(parseFloat(i.lineTotal || '0'))}` : '';
      return `• ${i.name} x${i.quantity}${price}`;
    });
    const total = detail.totalAmount ? formatCurrency(parseFloat(detail.totalAmount)) : null;

    const text = confirmed
      ? [
        `💰 *${company}*`,
        '',
        `Tu pedido *${detail.reference}* está *confirmado*:`,
        '',
        ...lines,
        total ? `\n*Total: ${total}*` : '',
        '',
        'Gracias por tu compra.',
      ].filter(Boolean).join('\n')
      : [
        `💰 *${company}*`,
        '',
        `Precios listos para *${detail.reference}*:`,
        '',
        ...lines,
        total ? `\n*Total: ${total}*` : '',
        '',
        'Responde para confirmar o ajustar tu pedido.',
      ].join('\n');

    void this.whatsapp.sendText(detail.clientPhone, text);
  }

  private async loadPresale(companyId: string, id: string) {
    const [row] = await this.db.select({
      id: presales.id,
      reference: presales.reference,
      totalAmount: presales.totalAmount,
      notes: presales.notes,
      clientId: presales.clientId,
      catalogId: presales.catalogId,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
      .from(presales)
      .innerJoin(clients, eq(presales.clientId, clients.id))
      .where(and(eq(presales.id, id), eq(presales.companyId, companyId)))
      .limit(1);
    if (!row) return null;

    let catalogName: string | null = null;
    if (row.catalogId) {
      const [cat] = await this.db.select({ name: catalogs.name }).from(catalogs)
        .where(eq(catalogs.id, row.catalogId)).limit(1);
      catalogName = cat?.name ?? null;
    }

    const items = await this.db.select({
      productName: products.name,
      quantity: presaleItems.quantity,
      lineTotal: presaleItems.lineTotal,
    })
      .from(presaleItems)
      .innerJoin(products, eq(presaleItems.productId, products.id))
      .where(eq(presaleItems.presaleId, id));

    return { ...row, catalogName, items };
  }

  private async loadOrderRequest(companyId: string, id: string) {
    const [row] = await this.db.select({
      id: orderRequests.id,
      reference: orderRequests.reference,
      totalAmount: orderRequests.totalAmount,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
      .from(orderRequests)
      .innerJoin(clients, eq(orderRequests.clientId, clients.id))
      .where(and(eq(orderRequests.id, id), eq(orderRequests.companyId, companyId)))
      .limit(1);
    if (!row) return null;

    const items = await this.db.select({
      name: products.name,
      quantity: orderRequestItems.quantity,
      unitPrice: orderRequestItems.unitPrice,
      lineTotal: orderRequestItems.lineTotal,
    })
      .from(orderRequestItems)
      .innerJoin(products, eq(orderRequestItems.productId, products.id))
      .where(eq(orderRequestItems.orderRequestId, id));

    return { ...row, items };
  }

  async recentOrdersSummary(companyId: string, limit = 8) {
    const presaleRows = await this.db.select({
      ref: presales.reference,
      status: presales.status,
      total: presales.totalAmount,
      clientName: clients.name,
      createdAt: presales.createdAt,
    })
      .from(presales)
      .innerJoin(clients, eq(presales.clientId, clients.id))
      .where(eq(presales.companyId, companyId))
      .orderBy(desc(presales.createdAt))
      .limit(limit);

    return presaleRows;
  }
}
