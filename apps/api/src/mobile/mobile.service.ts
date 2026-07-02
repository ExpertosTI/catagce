import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  catalogPdfs, products, productMedia, stockLevels, orderRequests, orderRequestItems, clients,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { InventoryBroadcastService, InventorySnapshot } from './inventory-broadcast.service';

@Injectable()
export class MobileService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private inventoryBroadcast: InventoryBroadcastService,
  ) {}

  async getActiveCatalogPdf(user: AuthUser) {
    const [pdf] = await this.db.select({
      id: catalogPdfs.id,
      title: catalogPdfs.title,
      fileName: catalogPdfs.fileName,
      fileUrl: catalogPdfs.fileUrl,
      version: catalogPdfs.version,
      createdAt: catalogPdfs.createdAt,
    })
      .from(catalogPdfs)
      .where(and(eq(catalogPdfs.companyId, user.companyId), eq(catalogPdfs.isActive, true)))
      .orderBy(desc(catalogPdfs.version), desc(catalogPdfs.createdAt))
      .limit(1);

    return pdf ?? null;
  }

  async uploadCatalogPdf(user: AuthUser, data: {
    title: string; fileName: string; fileUrl: string;
  }) {
    await this.db.update(catalogPdfs)
      .set({ isActive: false })
      .where(and(eq(catalogPdfs.companyId, user.companyId), eq(catalogPdfs.isActive, true)));

    const [{ maxVer }] = await this.db.select({
      maxVer: sql<number>`coalesce(max(${catalogPdfs.version}), 0)`,
    }).from(catalogPdfs).where(eq(catalogPdfs.companyId, user.companyId));

    const [pdf] = await this.db.insert(catalogPdfs).values({
      companyId: user.companyId,
      title: data.title.trim(),
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      version: (Number(maxVer) || 0) + 1,
      isActive: true,
      uploadedById: user.userId,
    }).returning();

    return pdf;
  }

  async getInventoryLive(user: AuthUser): Promise<InventorySnapshot> {
    const rows = await this.db.select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      imageUrl: productMedia.url,
      totalQty: stockLevels.totalQty,
      reservedQty: stockLevels.reservedQty,
      dispatchedQty: stockLevels.dispatchedQty,
    })
      .from(products)
      .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.isPrimary, true)))
      .leftJoin(stockLevels, and(eq(stockLevels.productId, products.id), eq(stockLevels.companyId, user.companyId)))
      .where(and(eq(products.companyId, user.companyId), eq(products.isActive, true)))
      .orderBy(products.name);

    const items = rows.map((r: any) => {
      const total = r.totalQty ?? 0;
      const reserved = r.reservedQty ?? 0;
      const dispatched = r.dispatchedQty ?? 0;
      const availableQty = Math.max(0, total - reserved - dispatched);
      return {
        productId: r.productId,
        sku: r.sku,
        name: r.name,
        unit: r.unit ?? 'un',
        imageUrl: r.imageUrl ?? null,
        available: availableQty > 0,
        availableQty,
      };
    });

    return { updatedAt: new Date().toISOString(), items };
  }

  async publishInventoryUpdate(user: AuthUser) {
    const snapshot = await this.getInventoryLive(user);
    this.inventoryBroadcast.publish(user.companyId, snapshot);
    return snapshot;
  }

  private async nextOrderReference(companyId: string) {
    const prefix = `PED-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const [{ count }] = await this.db.select({
      count: sql<number>`count(*)::int`,
    }).from(orderRequests).where(and(
      eq(orderRequests.companyId, companyId),
      sql`${orderRequests.reference} like ${prefix + '%'}`,
    ));
    return `${prefix}-${String((Number(count) || 0) + 1).padStart(4, '0')}`;
  }

  async createOrderRequest(user: AuthUser, data: {
    notes?: string;
    items: { productId: string; quantity: number; notes?: string }[];
  }) {
    if (user.type !== 'client') throw new ForbiddenException('Solo clientes pueden crear pedidos');
    if (!data.items?.length) throw new BadRequestException('El pedido debe tener al menos un producto');

    const reference = await this.nextOrderReference(user.companyId);

    const [order] = await this.db.insert(orderRequests).values({
      companyId: user.companyId,
      clientId: user.userId,
      reference,
      status: 'pending_pricing',
      notes: data.notes,
    }).returning();

    for (const item of data.items) {
      if (item.quantity < 1) continue;
      const [product] = await this.db.select({ id: products.id }).from(products)
        .where(and(eq(products.id, item.productId), eq(products.companyId, user.companyId))).limit(1);
      if (!product) throw new BadRequestException(`Producto ${item.productId} no válido`);

      await this.db.insert(orderRequestItems).values({
        orderRequestId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    return this.getOrderRequest(user, order.id);
  }

  async listOrderRequests(user: AuthUser) {
    const conditions = [eq(orderRequests.companyId, user.companyId)];
    if (user.type === 'client') {
      conditions.push(eq(orderRequests.clientId, user.userId));
    }

    return this.db.select({
      id: orderRequests.id,
      reference: orderRequests.reference,
      status: orderRequests.status,
      notes: orderRequests.notes,
      totalAmount: orderRequests.totalAmount,
      pricedAt: orderRequests.pricedAt,
      createdAt: orderRequests.createdAt,
      clientName: clients.name,
      clientEmail: clients.email,
    })
      .from(orderRequests)
      .innerJoin(clients, eq(orderRequests.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(orderRequests.createdAt));
  }

  async getOrderRequest(user: AuthUser, id: string) {
    const [order] = await this.db.select({
      id: orderRequests.id,
      reference: orderRequests.reference,
      status: orderRequests.status,
      notes: orderRequests.notes,
      totalAmount: orderRequests.totalAmount,
      pricedAt: orderRequests.pricedAt,
      createdAt: orderRequests.createdAt,
      clientId: orderRequests.clientId,
      clientName: clients.name,
    })
      .from(orderRequests)
      .innerJoin(clients, eq(orderRequests.clientId, clients.id))
      .where(and(eq(orderRequests.id, id), eq(orderRequests.companyId, user.companyId)))
      .limit(1);

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (user.type === 'client' && order.clientId !== user.userId) {
      throw new ForbiddenException('No autorizado');
    }

    const items = await this.db.select({
      id: orderRequestItems.id,
      productId: orderRequestItems.productId,
      quantity: orderRequestItems.quantity,
      unitPrice: orderRequestItems.unitPrice,
      lineTotal: orderRequestItems.lineTotal,
      notes: orderRequestItems.notes,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
    })
      .from(orderRequestItems)
      .innerJoin(products, eq(orderRequestItems.productId, products.id))
      .where(eq(orderRequestItems.orderRequestId, id));

    return { ...order, items };
  }

  async adjudicatePrices(user: AuthUser, orderId: string, data: {
    items: { id: string; unitPrice: number }[];
    confirm?: boolean;
  }) {
    if (user.type !== 'staff') throw new ForbiddenException('Solo admin puede adjudicar precios');

    const order = await this.getOrderRequest(user, orderId);
    if (order.status !== 'pending_pricing' && order.status !== 'priced') {
      throw new BadRequestException('Este pedido no admite adjudicación de precios');
    }

    let total = 0;
    for (const line of data.items) {
      const item = order.items.find((i: any) => i.id === line.id);
      if (!item) throw new BadRequestException(`Línea ${line.id} no encontrada`);
      if (line.unitPrice < 0) throw new BadRequestException('Precio inválido');

      const lineTotal = line.unitPrice * item.quantity;
      total += lineTotal;

      await this.db.update(orderRequestItems).set({
        unitPrice: line.unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      }).where(eq(orderRequestItems.id, line.id));
    }

    const status = data.confirm ? 'confirmed' : 'priced';

    await this.db.update(orderRequests).set({
      status,
      totalAmount: total.toFixed(2),
      pricedById: user.userId,
      pricedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orderRequests.id, orderId));

    return this.getOrderRequest(user, orderId);
  }
}
