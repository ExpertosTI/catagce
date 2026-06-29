import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and } from 'drizzle-orm';
import { orders, orderEvents, buyerContacts, orderItems, sellers } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private webhookDispatcher: WebhookDispatcherService,
    private inventoryService: InventoryService,
    private auditService: AuditService,
  ) {}

  async findAll(sellerId: string) {
    const result = await this.db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      with: { items: { with: { product: true } }, events: true },
    });
    return result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(data: {
    sellerId: string;
    catalogId?: string;
    publicationToken?: string;
    idempotencyKey?: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    totalAmount: string;
    notes?: string;
    items?: Array<{ productId: string; quantity: string; unitPrice: string; uomId?: number }>;
  }) {
    const [order] = await this.db.insert(orders).values({
      sellerId: data.sellerId,
      catalogId: data.catalogId,
      publicationToken: data.publicationToken,
      idempotencyKey: data.idempotencyKey,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerEmail: data.buyerEmail,
      totalAmount: data.totalAmount,
      notes: data.notes,
      status: 'submitted',
    }).returning();

    if (data.items?.length) {
      await this.db.insert(orderEvents).values({
        orderId: order.id, eventType: 'created', payload: { items: data.items },
      });

      await this.db.insert(orderItems).values(
        data.items.map((item) => ({ ...item, orderId: order.id })),
      );

      const reservations = await this.inventoryService.reserveForOrder(
        data.sellerId,
        order.id,
        data.items.map((i) => ({ productId: i.productId, quantity: parseFloat(i.quantity) })),
      );

      if (reservations.length > 0) {
        await this.db.update(orders).set({ status: 'reserved' }).where(eq(orders.id, order.id));
        order.status = 'reserved';
      }
    }

    await this.upsertBuyerContact(data.sellerId, data.buyerName, data.buyerPhone, data.buyerEmail, data.totalAmount);

    const seller = await this.db.query.sellers.findFirst({ where: eq(sellers.id, data.sellerId) });

    await this.notificationsQueue.add('ORDER_CREATED', {
      type: 'ORDER_CREATED',
      data: {
        phone: data.buyerPhone, orderId: order.id,
        sellerName: seller?.name || 'Comercio', buyerName: data.buyerName, totalAmount: data.totalAmount,
      },
    });

    await this.webhookDispatcher.dispatch(data.sellerId, 'order.created', {
      orderId: order.id, buyerName: data.buyerName, buyerPhone: data.buyerPhone,
      totalAmount: data.totalAmount, items: data.items,
    });

    return order;
  }

  private async upsertBuyerContact(sellerId: string, name: string, phone: string, email?: string, amount?: string) {
    const existing = await this.db.query.buyerContacts.findFirst({
      where: and(eq(buyerContacts.sellerId, sellerId), eq(buyerContacts.phone, phone)),
    });

    if (existing) {
      await this.db.update(buyerContacts).set({
        orderCount: sql`${buyerContacts.orderCount} + 1`,
        totalSpent: sql`${buyerContacts.totalSpent} + ${parseFloat(amount || '0')}`,
        lastOrderAt: new Date(), name,
      }).where(eq(buyerContacts.id, existing.id));
    } else {
      await this.db.insert(buyerContacts).values({
        sellerId, name, phone, email, orderCount: 1,
        totalSpent: amount || '0', lastOrderAt: new Date(),
      });
    }
  }

  async updateStatus(id: string, sellerId: string, status: string, actorUserId?: string) {
    const [order] = await this.db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (!order) return null;

    await this.db.insert(orderEvents).values({
      orderId: id, eventType: `status_${status}`, actorUserId, payload: { status },
    });

    if (status === 'confirmed') {
      await this.inventoryService.confirmOrder(sellerId, id, actorUserId);
    } else if (status === 'rejected' || status === 'cancelled') {
      await this.inventoryService.releaseReservations(id);
    }

    await this.webhookDispatcher.dispatch(sellerId, 'order.updated', { orderId: id, status });
    await this.auditService.log({
      sellerId, actorUserId, action: `order.${status}`,
      entityType: 'order', entityId: id,
    });

    return order;
  }
}
