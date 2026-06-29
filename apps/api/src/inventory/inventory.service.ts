import {
  Injectable, Inject, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import {
  warehouses, stockLevels, stockMovements, stockReservations,
  uoms, products,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private auditService: AuditService,
  ) {}

  async getWarehouses(sellerId: string) {
    return this.db.query.warehouses.findMany({
      where: eq(warehouses.sellerId, sellerId),
      with: { stockLevels: { with: { product: true } } },
    });
  }

  async createWarehouse(sellerId: string, data: { name: string; address?: string }) {
    const [warehouse] = await this.db.insert(warehouses).values({ sellerId, ...data }).returning();
    return warehouse;
  }

  async getStockLevels(sellerId: string) {
    return this.db.query.stockLevels.findMany({
      where: eq(stockLevels.sellerId, sellerId),
      with: { product: true, warehouse: true },
    });
  }

  async getMovements(sellerId: string, limit = 100) {
    return this.db.query.stockMovements.findMany({
      where: eq(stockMovements.sellerId, sellerId),
      with: { product: true, warehouse: true },
      limit,
    });
  }

  async getUoms(sellerId: string) {
    return this.db.query.uoms.findMany({ where: eq(uoms.sellerId, sellerId) });
  }

  async adjustStock(sellerId: string, data: {
    warehouseId: string;
    productId: string;
    quantity: number;
    uomId?: number;
    reasonCode?: string;
    actorUserId?: string;
    notes?: string;
  }) {
    let baseDelta = data.quantity;
    if (data.uomId) {
      const uom = await this.db.query.uoms.findFirst({ where: eq(uoms.id, data.uomId) });
      if (uom) baseDelta = data.quantity * parseFloat(uom.conversionFactor || '1');
    }

    return this.applyMovement(sellerId, {
      warehouseId: data.warehouseId,
      productId: data.productId,
      movementType: 'adjustment',
      quantityBaseDelta: baseDelta,
      sourceUomId: data.uomId,
      sourceQuantity: String(data.quantity),
      reasonCode: data.reasonCode || 'manual_adjustment',
      actorUserId: data.actorUserId,
      notes: data.notes,
    });
  }

  async inbound(sellerId: string, data: {
    warehouseId: string;
    productId: string;
    quantity: number;
    uomId?: number;
    actorUserId?: string;
    notes?: string;
  }) {
    let baseQty = data.quantity;
    if (data.uomId) {
      const uom = await this.db.query.uoms.findFirst({ where: eq(uoms.id, data.uomId) });
      if (uom) baseQty = data.quantity * parseFloat(uom.conversionFactor || '1');
    }

    return this.applyMovement(sellerId, {
      warehouseId: data.warehouseId,
      productId: data.productId,
      movementType: 'inbound',
      quantityBaseDelta: baseQty,
      sourceUomId: data.uomId,
      sourceQuantity: String(data.quantity),
      reasonCode: 'inbound_receipt',
      actorUserId: data.actorUserId,
      notes: data.notes,
    });
  }

  async applyMovement(sellerId: string, data: {
    warehouseId: string;
    productId: string;
    movementType: string;
    quantityBaseDelta: number;
    sourceUomId?: number;
    sourceQuantity?: string;
    reasonCode?: string;
    actorUserId?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }) {
    const stock = await this.db.query.stockLevels.findFirst({
      where: and(
        eq(stockLevels.warehouseId, data.warehouseId),
        eq(stockLevels.productId, data.productId),
      ),
    });

    if (stock) {
      const newOnHand = parseFloat(stock.onHandBase) + data.quantityBaseDelta;
      if (newOnHand < 0) throw new BadRequestException('Stock insuficiente');
      await this.db.update(stockLevels)
        .set({ onHandBase: String(newOnHand.toFixed(4)), updatedAt: new Date() })
        .where(eq(stockLevels.id, stock.id));
    } else if (data.quantityBaseDelta > 0) {
      await this.db.insert(stockLevels).values({
        sellerId, warehouseId: data.warehouseId, productId: data.productId,
        onHandBase: String(data.quantityBaseDelta.toFixed(4)),
      });
    } else {
      throw new BadRequestException('No hay stock para este producto');
    }

    const [movement] = await this.db.insert(stockMovements).values({
      sellerId,
      warehouseId: data.warehouseId,
      productId: data.productId,
      movementType: data.movementType,
      quantityBaseDelta: String(data.quantityBaseDelta.toFixed(4)),
      sourceUomId: data.sourceUomId,
      sourceQuantity: data.sourceQuantity,
      reasonCode: data.reasonCode,
      actorUserId: data.actorUserId,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
    }).returning();

    await this.auditService.log({
      sellerId, actorUserId: data.actorUserId, action: `stock.${data.movementType}`,
      entityType: 'stock_movement', entityId: movement.id,
      changes: { productId: data.productId, delta: data.quantityBaseDelta },
    });

    return movement;
  }

  async reserveForOrder(sellerId: string, orderId: string, items: Array<{
    productId: string; quantity: number; warehouseId?: string;
  }>, ttlMinutes = 60) {
    const defaultWarehouse = await this.db.query.warehouses.findFirst({
      where: and(eq(warehouses.sellerId, sellerId), eq(warehouses.isDefault, true)),
    });
    if (!defaultWarehouse) throw new BadRequestException('No hay almacén configurado');

    const reservations = [];
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    for (const item of items) {
      const warehouseId = item.warehouseId || defaultWarehouse.id;
      const stock = await this.db.query.stockLevels.findFirst({
        where: and(eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.productId, item.productId)),
      });

      if (!stock) continue;

      const available = parseFloat(stock.onHandBase) - parseFloat(stock.reservedBase || '0');
      const toReserve = Math.min(item.quantity, available);
      if (toReserve <= 0) continue;

      const [reservation] = await this.db.insert(stockReservations).values({
        sellerId, orderId, warehouseId, productId: item.productId,
        reservedBase: String(toReserve), status: 'active', expiresAt,
      }).returning();

      await this.db.update(stockLevels)
        .set({
          reservedBase: sql`${stockLevels.reservedBase} + ${toReserve}`,
          updatedAt: new Date(),
        })
        .where(eq(stockLevels.id, stock.id));

      await this.db.insert(stockMovements).values({
        sellerId, warehouseId, productId: item.productId,
        movementType: 'reservation_hold',
        quantityBaseDelta: '0',
        referenceType: 'order', referenceId: orderId,
        reasonCode: 'order_reservation',
      });

      reservations.push(reservation);
    }

    return reservations;
  }

  async confirmOrder(sellerId: string, orderId: string, actorUserId?: string) {
    const reservations = await this.db.query.stockReservations.findMany({
      where: and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'active')),
    });

    for (const res of reservations) {
      const qty = parseFloat(res.reservedBase);
      const stock = await this.db.query.stockLevels.findFirst({
        where: and(eq(stockLevels.warehouseId, res.warehouseId), eq(stockLevels.productId, res.productId)),
      });

      if (stock) {
        await this.db.update(stockLevels).set({
          onHandBase: sql`${stockLevels.onHandBase} - ${qty}`,
          reservedBase: sql`${stockLevels.reservedBase} - ${qty}`,
          updatedAt: new Date(),
        }).where(eq(stockLevels.id, stock.id));
      }

      await this.db.update(stockReservations)
        .set({ status: 'consumed' })
        .where(eq(stockReservations.id, res.id));

      await this.db.insert(stockMovements).values({
        sellerId, warehouseId: res.warehouseId, productId: res.productId,
        movementType: 'order_confirmed', quantityBaseDelta: String(-qty),
        referenceType: 'order', referenceId: orderId, actorUserId,
        reasonCode: 'order_confirmed',
      });
    }

    await this.auditService.log({
      sellerId, actorUserId, action: 'order.confirmed',
      entityType: 'order', entityId: orderId,
    });
  }

  async releaseReservations(orderId: string) {
    const reservations = await this.db.query.stockReservations.findMany({
      where: and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'active')),
    });

    for (const res of reservations) {
      const qty = parseFloat(res.reservedBase);
      await this.db.update(stockLevels).set({
        reservedBase: sql`${stockLevels.reservedBase} - ${qty}`,
        updatedAt: new Date(),
      }).where(and(
        eq(stockLevels.warehouseId, res.warehouseId),
        eq(stockLevels.productId, res.productId),
      ));

      await this.db.update(stockReservations)
        .set({ status: 'released' })
        .where(eq(stockReservations.id, res.id));
    }
  }

  async getLowStock(sellerId: string) {
    const levels = await this.getStockLevels(sellerId);
    return levels.filter((l: any) => {
      const available = parseFloat(l.onHandBase) - parseFloat(l.reservedBase || '0');
      const threshold = parseFloat(l.minimumThresholdBase || '10');
      return available <= threshold;
    });
  }
}
