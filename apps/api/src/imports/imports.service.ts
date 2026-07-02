import { Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { importShipments, importItems, products, suppliers, stockLevels, warehouses } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { MobileService } from '../mobile/mobile.service';

@Injectable()
export class ImportsService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @Inject(forwardRef(() => MobileService)) private mobileService: MobileService,
  ) {}

  async list(user: AuthUser) {
    return this.db.select({
      id: importShipments.id,
      reference: importShipments.reference,
      containerNumber: importShipments.containerNumber,
      status: importShipments.status,
      etaDate: importShipments.etaDate,
      receivedAt: importShipments.receivedAt,
      supplierName: suppliers.name,
    })
      .from(importShipments)
      .leftJoin(suppliers, eq(importShipments.supplierId, suppliers.id))
      .where(eq(importShipments.companyId, user.companyId))
      .orderBy(desc(importShipments.createdAt));
  }

  async create(user: AuthUser, data: {
    reference: string; containerNumber?: string; supplierId?: string;
    etaDate?: string; notes?: string;
    items?: { productId: string; quantity: number; unitCost?: number; warehouseId?: string }[];
  }) {
    const [shipment] = await this.db.insert(importShipments).values({
      companyId: user.companyId,
      reference: data.reference,
      containerNumber: data.containerNumber,
      supplierId: data.supplierId,
      etaDate: data.etaDate ? new Date(data.etaDate) : null,
      notes: data.notes,
      status: 'in_transit',
    }).returning();

    if (data.items?.length) {
      for (const item of data.items) {
        await this.db.insert(importItems).values({
          shipmentId: shipment.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost?.toFixed(2),
          warehouseId: item.warehouseId,
        });
      }
    }

    return shipment;
  }

  async receive(user: AuthUser, shipmentId: string) {
    const [shipment] = await this.db.select().from(importShipments)
      .where(and(eq(importShipments.id, shipmentId), eq(importShipments.companyId, user.companyId))).limit(1);
    if (!shipment) throw new NotFoundException('Importación no encontrada');
    if (shipment.status === 'received') throw new NotFoundException('Ya fue recibida');

    const items = await this.db.select().from(importItems).where(eq(importItems.shipmentId, shipmentId));

    for (const item of items) {
      const whId = item.warehouseId;
      let warehouseId = whId;
      if (!warehouseId) {
        const [wh] = await this.db.select().from(warehouses)
          .where(and(eq(warehouses.companyId, user.companyId), eq(warehouses.isDefault, true))).limit(1);
        warehouseId = wh?.id;
      }
      if (!warehouseId) continue;

      const [stock] = await this.db.select().from(stockLevels)
        .where(and(
          eq(stockLevels.companyId, user.companyId),
          eq(stockLevels.productId, item.productId),
          eq(stockLevels.warehouseId, warehouseId),
        )).limit(1);

      if (stock) {
        await this.db.update(stockLevels).set({
          totalQty: stock.totalQty + item.quantity,
          updatedAt: new Date(),
        }).where(eq(stockLevels.id, stock.id));
      } else {
        await this.db.insert(stockLevels).values({
          companyId: user.companyId,
          productId: item.productId,
          warehouseId,
          totalQty: item.quantity,
          reservedQty: 0,
          dispatchedQty: 0,
        });
      }
    }

    const [updated] = await this.db.update(importShipments).set({
      status: 'received',
      receivedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(importShipments.id, shipmentId)).returning();

    await this.mobileService.publishInventoryUpdate(user);

    return updated;
  }
}
