import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  catalogPublications,
  orders,
  products,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { OrdersService } from '../orders/orders.service';
import { OrderWhatsAppSyncService } from '../common/services/order-whatsapp-sync.service';
import { normalizePhoneDigits } from '../common/utils/phone.util';
import { orderRef, verifyBuyerPrefill } from '../common/utils/signed-prefill';

@Injectable()
export class PublicService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private ordersService: OrdersService,
    private orderSync: OrderWhatsAppSyncService,
  ) {}

  async getCatalogByToken(token: string, prefillToken?: string) {
    const publication = await this.db.query.catalogPublications.findFirst({
      where: eq(catalogPublications.token, token),
      with: {
        catalog: {
          with: {
            catalogProducts: { with: { product: { with: { stockLevels: true } } } },
            seller: { with: { branding: true, settings: true } },
          },
        },
      },
    });

    if (!publication || !publication.isActive) {
      throw new NotFoundException('Catálogo no encontrado o inactivo');
    }

    if (publication.expiresAt && new Date(publication.expiresAt) < new Date()) {
      throw new NotFoundException('Este enlace de catálogo ha expirado');
    }

    await this.db
      .update(catalogPublications)
      .set({ viewCount: (publication.viewCount || 0) + 1 })
      .where(eq(catalogPublications.id, publication.id));

    const prefill = prefillToken ? verifyBuyerPrefill(prefillToken) : null;

    return {
      catalog: publication.catalog,
      branding: publication.catalog?.seller?.branding,
      seller: publication.catalog?.seller,
      whatsappNumber:
        publication.catalog?.seller?.settings?.evolutionPhone
        || publication.catalog?.seller?.settings?.whatsappNumber
        || publication.catalog?.seller?.phone
        || null,
      token: publication.token,
      prefill: prefill
        ? { phone: prefill.phone, name: prefill.name || '' }
        : null,
    };
  }

  async createOrder(data: {
    token: string;
    buyerName: string;
    buyerPhone: string;
    items: Array<{ productId: string; quantity: number }>;
    notes?: string;
    source?: string;
  }) {
    const publication = await this.db.query.catalogPublications.findFirst({
      where: eq(catalogPublications.token, data.token),
      with: { catalog: true },
    });

    if (!publication?.catalog) {
      throw new NotFoundException('Token de catálogo inválido');
    }

    if (!data.items?.length) {
      throw new BadRequestException('El pedido debe incluir al menos un producto');
    }

    const phone = normalizePhoneDigits(data.buyerPhone);
    const source = data.source || 'whatsapp_link';
    const idempotencyKey = this.orderSync.buildIdempotencyKey(data.token, phone, data.items);

    const existing = await this.orderSync.findRecentByIdempotency(publication.catalog.sellerId, idempotencyKey);
    if (existing) {
      const sync = await this.orderSync.notifySellerNewOrder({
        sellerId: publication.catalog.sellerId,
        orderId: existing.id,
        buyerName: existing.buyerName,
        buyerPhone: existing.buyerPhone,
        totalAmount: String(existing.totalAmount || '0'),
        itemCount: data.items.length,
      }).catch(() => null);
      return {
        ...existing,
        ref: orderRef(existing.id),
        trackingUrl: this.orderSync.trackingUrl(existing.id),
        whatsappTicketId: sync?.ticketId || existing.whatsappTicketId,
        deduped: true,
      };
    }

    let totalAmount = 0;
    const orderItemsData: Array<{ productId: string; quantity: string; unitPrice: string }> = [];

    for (const item of data.items) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);

      const unitPrice = parseFloat(product.b2bPrice || product.basePrice);
      totalAmount += unitPrice * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        quantity: String(item.quantity),
        unitPrice: String(unitPrice),
      });
    }

    const ticket = await this.orderSync.ensureTicket(
      publication.catalog.sellerId,
      phone,
      data.buyerName,
    );

    const order = await this.ordersService.create({
      sellerId: publication.catalog.sellerId,
      catalogId: publication.catalog.id,
      publicationToken: data.token,
      idempotencyKey,
      buyerName: data.buyerName,
      buyerPhone: phone,
      totalAmount: String(totalAmount.toFixed(2)),
      notes: data.notes,
      source,
      whatsappTicketId: ticket?.id,
      items: orderItemsData,
    });

    const sync = await this.orderSync.notifySellerNewOrder({
      sellerId: publication.catalog.sellerId,
      orderId: order.id,
      buyerName: data.buyerName,
      buyerPhone: phone,
      totalAmount: String(totalAmount.toFixed(2)),
      itemCount: data.items.length,
    });

    return {
      ...order,
      ref: orderRef(order.id),
      trackingUrl: this.orderSync.trackingUrl(order.id),
      whatsappTicketId: sync.ticketId || ticket?.id || null,
      deduped: false,
    };
  }

  async getOrderPublic(orderId: string) {
    const found = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: { with: { product: true } }, catalog: true },
    });
    if (!found) throw new NotFoundException('Pedido no encontrado');
    return {
      id: found.id,
      ref: orderRef(found.id),
      status: found.status,
      buyerName: found.buyerName,
      totalAmount: found.totalAmount,
      source: found.source,
      catalogName: found.catalog?.name,
      items: (found.items || []).map((i: any) => ({
        name: i.product?.name || 'Producto',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      createdAt: found.createdAt,
    };
  }
}
