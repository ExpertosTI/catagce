import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import {
  catalogs,
  orderItems,
  orders,
  products,
  sellers,
  stockLevels,
  stockMovements,
  stockReservations,
  warehouses,
} from '@catagce/db';
import { and, eq, sql } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface OrderedItem {
  productId: string;
  quantity: number;
  uomId?: number;
  resolvedUnitPrice: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      with: { orderItems: { with: { product: true } } },
      orderBy: (o: any, { desc }: any) => [desc(o.createdAt)],
      limit: 500,
    });
  }

  async findOne(sellerId: string, id: string) {
    const order = await this.db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.sellerId, sellerId)),
      with: { orderItems: { with: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async submitPublicOrder(data: {
    catalogSlug: string;
    buyerName: string;
    buyerPhone: string;
    idempotencyKey?: string;
    items: Array<{ productId: string; quantity: number; uomId?: number }>;
  }) {
    const { catalogSlug, buyerName, buyerPhone, idempotencyKey, items } = data;

    const catalog = await this.db.query.catalogs.findFirst({
      where: and(eq(catalogs.slug, catalogSlug), eq(catalogs.isActive, true)),
    });
    if (!catalog) throw new NotFoundException('Catalog not found');

    const sellerId: string = catalog.sellerId;

    if (idempotencyKey) {
      const existing = await this.db.query.orders.findFirst({
        where: and(eq(orders.idempotencyKey, idempotencyKey), eq(orders.sellerId, sellerId)),
      });
      if (existing) return existing;
    }

    const orderedItems: OrderedItem[] = await Promise.all(
      items.map(async (item) => {
        const product = await this.db.query.products.findFirst({
          where: and(eq(products.id, item.productId), eq(products.sellerId, sellerId), eq(products.isActive, true)),
        });
        if (!product) {
          throw new BadRequestException(`Producto ${item.productId} no disponible`);
        }
        const resolvedUnitPrice = parseFloat(product.b2bPrice ?? product.basePrice);
        if (!Number.isFinite(resolvedUnitPrice)) {
          throw new BadRequestException(`Precio inválido para producto ${item.productId}`);
        }
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

    // Reserva de inventario (no bloquea el pedido si falla, pero queda registrado)
    try {
      await this.reserveStock(order.id, sellerId, orderedItems);
    } catch (err: any) {
      this.logger.warn(`Reserva de stock falló para pedido ${order.id}: ${err.message}`);
    }

    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);

    await this.notificationsQueue.add(
      'ORDER_CREATED',
      {
        type: 'ORDER_CREATED',
        data: {
          phone: buyerPhone,
          orderId: order.id,
          sellerName: seller?.name ?? 'Catagce',
          buyerName,
          totalAmount,
        },
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 100, removeOnFail: 500 },
    );

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
      try {
        await this.consumeReservations(id, sellerId);
      } catch (err: any) {
        this.logger.warn(`Consumo de stock falló (orden ${id}): ${err.message}`);
      }
      await this.notificationsQueue.add('ORDER_CONFIRMED', {
        type: 'ORDER_CONFIRMED',
        data: { orderId: id, sellerId },
      });
    }

    if (status === 'rejected' || status === 'cancelled' || status === 'expired') {
      try {
        await this.releaseReservations(id, sellerId);
      } catch (err: any) {
        this.logger.warn(`Liberación de stock falló (orden ${id}): ${err.message}`);
      }
      await this.notificationsQueue.add('ORDER_CANCELLED', {
        type: 'ORDER_CANCELLED',
        data: { orderId: id, sellerId },
      });
    }

    return updated;
  }

  // ─────────────────────────── Inventory ────────────────────────────

  private async getDefaultWarehouse(sellerId: string): Promise<string | null> {
    const [w] = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.sellerId, sellerId), eq(warehouses.isDefault, true)))
      .limit(1);
    if (w) return w.id;
    const [first] = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.sellerId, sellerId))
      .limit(1);
    return first?.id ?? null;
  }

  private async reserveStock(orderId: string, sellerId: string, items: OrderedItem[]) {
    const warehouseId = await this.getDefaultWarehouse(sellerId);
    if (!warehouseId) return; // sin almacén → no se reserva, queda como info

    for (const item of items) {
      await this.db
        .insert(stockReservations)
        .values({
          sellerId,
          orderId,
          warehouseId,
          productId: item.productId,
          reservedBase: item.quantity.toString(),
          status: 'active',
        })
        .onConflictDoNothing();

      await this.db
        .update(stockLevels)
        .set({ reservedBase: sql`COALESCE(${stockLevels.reservedBase}, 0) + ${item.quantity}` })
        .where(
          and(
            eq(stockLevels.sellerId, sellerId),
            eq(stockLevels.warehouseId, warehouseId),
            eq(stockLevels.productId, item.productId),
          ),
        );

      await this.db.insert(stockMovements).values({
        sellerId,
        warehouseId,
        productId: item.productId,
        movementType: 'reservation_hold',
        quantityBaseDelta: item.quantity.toString(),
        referenceType: 'order',
        referenceId: orderId,
        reasonCode: 'order_submitted',
      });
    }
  }

  private async releaseReservations(orderId: string, sellerId: string) {
    const reservations = await this.db
      .select()
      .from(stockReservations)
      .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'active')));

    for (const r of reservations) {
      await this.db
        .update(stockReservations)
        .set({ status: 'released' })
        .where(eq(stockReservations.id, r.id));

      await this.db
        .update(stockLevels)
        .set({ reservedBase: sql`GREATEST(COALESCE(${stockLevels.reservedBase}, 0) - ${r.reservedBase}, 0)` })
        .where(
          and(
            eq(stockLevels.sellerId, sellerId),
            eq(stockLevels.warehouseId, r.warehouseId),
            eq(stockLevels.productId, r.productId),
          ),
        );

      await this.db.insert(stockMovements).values({
        sellerId,
        warehouseId: r.warehouseId,
        productId: r.productId,
        movementType: 'reservation_release',
        quantityBaseDelta: r.reservedBase,
        referenceType: 'order',
        referenceId: orderId,
        reasonCode: 'order_cancelled',
      });
    }
  }

  private async consumeReservations(orderId: string, sellerId: string) {
    const reservations = await this.db
      .select()
      .from(stockReservations)
      .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'active')));

    for (const r of reservations) {
      await this.db
        .update(stockReservations)
        .set({ status: 'consumed' })
        .where(eq(stockReservations.id, r.id));

      await this.db
        .update(stockLevels)
        .set({
          onHandBase: sql`GREATEST(COALESCE(${stockLevels.onHandBase}, 0) - ${r.reservedBase}, 0)`,
          reservedBase: sql`GREATEST(COALESCE(${stockLevels.reservedBase}, 0) - ${r.reservedBase}, 0)`,
        })
        .where(
          and(
            eq(stockLevels.sellerId, sellerId),
            eq(stockLevels.warehouseId, r.warehouseId),
            eq(stockLevels.productId, r.productId),
          ),
        );

      await this.db.insert(stockMovements).values({
        sellerId,
        warehouseId: r.warehouseId,
        productId: r.productId,
        movementType: 'order_confirmed',
        quantityBaseDelta: sql`-${r.reservedBase}`,
        referenceType: 'order',
        referenceId: orderId,
        reasonCode: 'order_confirmed',
      });
    }
  }
}
