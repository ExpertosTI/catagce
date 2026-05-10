import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { orders, orderItems, sellers, catalogs, stockLevels, products } from '@catagce/db';
import { and, eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      with: { orderItems: { with: { product: true } } },
    });
  }

  /**
   * Zero-login public order submission from buyer.
   * Resolves seller context via catalogSlug — never from a client-provided sellerId.
   */
  async submitPublicOrder(data: {
    catalogSlug: string;
    buyerName: string;
    buyerPhone: string;
    idempotencyKey?: string;
    items: Array<{ productId: string; quantity: number; uomId?: number }>;
  }) {
    const { catalogSlug, buyerName, buyerPhone, idempotencyKey, items } = data;

    if (!buyerName || !buyerPhone || !catalogSlug || !items?.length) {
      throw new BadRequestException('catalogSlug, buyerName, buyerPhone and items are required');
    }

    // Resolve seller from catalog slug — client never provides sellerId directly
    const catalog = await this.db.query.catalogs.findFirst({
      where: and(eq(catalogs.slug, catalogSlug), eq(catalogs.isActive, true)),
    });
    if (!catalog) throw new NotFoundException('Catalog not found');

    const sellerId: string = catalog.sellerId;

    // Idempotency: return existing order if already submitted
    if (idempotencyKey) {
      const existing = await this.db.query.orders.findFirst({
        where: and(eq(orders.idempotencyKey, idempotencyKey), eq(orders.sellerId, sellerId)),
      });
      if (existing) return existing;
    }

    // Resolve price server-side from product record — NEVER trust client-provided unitPrice
    const orderedItems = await Promise.all(
      items.map(async (item) => {
        const foundProduct = await this.db.query.products.findFirst({
          where: and(eq(products.id, item.productId), eq(products.sellerId, sellerId)),
        });
        if (!foundProduct) {
          throw new BadRequestException(`Product ${item.productId} not found in this catalog`);
        }
        // Use b2bPrice if available, otherwise basePrice (catalog price snapshot)
        const resolvedUnitPrice = parseFloat(foundProduct.b2bPrice ?? foundProduct.basePrice);
        return {
          productId: item.productId,
          quantity: item.quantity,
          uomId: item.uomId,
          resolvedUnitPrice,
        };
      }),
    );

    const totalAmount = orderedItems
      .reduce((sum, item) => sum + item.quantity * item.resolvedUnitPrice, 0)
      .toFixed(2);

    const [order] = await this.db
      .insert(orders)
      .values({
        sellerId,
        catalogId: catalog.id,
        buyerName,
        buyerPhone,
        totalAmount,
        idempotencyKey: idempotencyKey ?? null,
        status: 'submitted',
      })
      .returning();

    await this.db.insert(orderItems).values(
      orderedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        uomId: item.uomId ?? null,
        quantity: item.quantity.toString(),
        unitPrice: item.resolvedUnitPrice.toFixed(2),
        subtotal: (item.quantity * item.resolvedUnitPrice).toFixed(2),
      })),
    );

    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);

    await this.notificationsQueue.add('ORDER_CREATED', {
      type: 'ORDER_CREATED',
      data: {
        phone: buyerPhone,
        orderId: order.id,
        sellerName: seller?.name ?? 'Catagce',
        buyerName,
        totalAmount,
      },
    });

    return order;
  }

  async updateStatus(id: string, sellerId: string, status: string) {
    const [existing] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.sellerId, sellerId)))
      .limit(1);

    if (!existing) throw new ForbiddenException('Order not found or access denied');

    const [updated] = await this.db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    if (status === 'confirmed') {
      // Release reservations on confirmation via stock movement logic
      // (Full inventory deduction is handled by a dedicated use case in a future phase)
      await this.notificationsQueue.add('ORDER_CONFIRMED', {
        type: 'ORDER_CONFIRMED',
        data: { orderId: id, sellerId },
      });
    }

    if (status === 'rejected' || status === 'cancelled') {
      await this.notificationsQueue.add('ORDER_CANCELLED', {
        type: 'ORDER_CANCELLED',
        data: { orderId: id, sellerId },
      });
    }

    return updated;
  }
}
