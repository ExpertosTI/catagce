import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { products, productVariants, productBarcodes, productMedia, stockLevels, uoms, warehouses } from '@catagce/db';
import { eq, and, sql } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('media') private mediaQueue: Queue,
    private webhookDispatcher: WebhookDispatcherService,
    private auditService: AuditService,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.products.findMany({
      where: and(eq(products.sellerId, sellerId), eq(products.isActive, true)),
      with: { stockLevels: true },
    });
  }

  async findOne(id: string, sellerId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.sellerId, sellerId)),
      with: { stockLevels: true, variants: true, media: true, barcodes: true, baseUom: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(sellerId: string, data: any, actorUserId?: string) {
    let baseUomId = data.baseUomId;
    if (!baseUomId) {
      const [defaultUom] = await this.db
        .select({ id: uoms.id })
        .from(uoms)
        .where(eq(uoms.sellerId, sellerId))
        .limit(1);
      if (!defaultUom) throw new BadRequestException('Configura una unidad de medida primero');
      baseUomId = defaultUom.id;
    }

    let warehouseId = data.warehouseId;
    if (!warehouseId && data.initialStock) {
      const [defaultWh] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.sellerId, sellerId), eq(warehouses.isDefault, true)))
        .limit(1);
      warehouseId = defaultWh?.id;
    }

    const [product] = await this.db.insert(products).values({
      sellerId,
      name: data.name?.trim(),
      sku: data.sku?.trim() || null,
      description: data.description?.trim() || null,
      category: data.category?.trim() || null,
      baseUomId,
      basePrice: String(data.basePrice),
      b2bPrice: data.b2bPrice ? String(data.b2bPrice) : null,
      minOrderQuantity: data.minOrderQuantity ? String(data.minOrderQuantity) : '1',
      imageUrl: data.imageUrl?.trim() || null,
      isActive: data.isActive ?? true,
    }).returning();

    if (data.initialStock && warehouseId) {
      await this.db.insert(stockLevels).values({
        sellerId, warehouseId, productId: product.id,
        onHandBase: String(data.initialStock),
      });
    }

    if (product.imageUrl) {
      try {
        await this.mediaQueue.add('process-product-media', {
          productId: product.id, imageUrl: product.imageUrl, sellerId,
        });
      } catch (err) {
        console.warn('Media queue unavailable:', err);
      }
    }

    try {
      await this.webhookDispatcher.dispatch(sellerId, 'product.created', { product });
      await this.auditService.log({
        sellerId, actorUserId, action: 'product.created',
        entityType: 'product', entityId: product.id,
      });
    } catch (err) {
      console.warn('Post-create hooks failed:', err);
    }

    return product;
  }

  async update(id: string, sellerId: string, data: any, actorUserId?: string) {
    await this.findOne(id, sellerId);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name != null) updates.name = String(data.name).trim();
    if (data.sku != null) updates.sku = data.sku?.trim() || null;
    if (data.description != null) updates.description = data.description?.trim() || null;
    if (data.category != null) updates.category = data.category?.trim() || null;
    if (data.basePrice != null) updates.basePrice = String(data.basePrice);
    if (data.b2bPrice != null) updates.b2bPrice = data.b2bPrice ? String(data.b2bPrice) : null;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl || null;

    const [product] = await this.db.update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId)))
      .returning();

    if (data.stock != null) {
      const stockVal = String(data.stock);
      const [existing] = await this.db
        .select()
        .from(stockLevels)
        .where(and(eq(stockLevels.productId, id), eq(stockLevels.sellerId, sellerId)))
        .limit(1);

      if (existing) {
        await this.db.update(stockLevels)
          .set({ onHandBase: stockVal })
          .where(eq(stockLevels.id, existing.id));
      } else if (parseFloat(stockVal) > 0) {
        const [defaultWh] = await this.db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(and(eq(warehouses.sellerId, sellerId), eq(warehouses.isDefault, true)))
          .limit(1);
        if (defaultWh) {
          await this.db.insert(stockLevels).values({
            sellerId, warehouseId: defaultWh.id, productId: id, onHandBase: stockVal,
          });
        }
      }
    }

    if (data.imageUrl) {
      try {
        await this.mediaQueue.add('process-product-media', {
          productId: id, imageUrl: data.imageUrl, sellerId,
        });
      } catch { /* queue optional */ }
    }

    try {
      await this.webhookDispatcher.dispatch(sellerId, 'product.updated', { product });
      await this.auditService.log({
        sellerId, actorUserId, action: 'product.updated',
        entityType: 'product', entityId: id, changes: data,
      });
    } catch { /* non-blocking */ }

    return this.findOne(id, sellerId);
  }

  async delete(id: string, sellerId: string, actorUserId?: string) {
    await this.findOne(id, sellerId);
    await this.db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId)));

    await this.auditService.log({
      sellerId, actorUserId, action: 'product.deactivated',
      entityType: 'product', entityId: id,
    });

    return { success: true };
  }

  async addVariant(productId: string, sellerId: string, data: { name: string; sku?: string; priceAdjustment?: number }) {
    await this.findOne(productId, sellerId);
    const [variant] = await this.db.insert(productVariants).values({
      productId, name: data.name, sku: data.sku,
      priceAdjustment: data.priceAdjustment ? String(data.priceAdjustment) : '0',
    }).returning();
    return variant;
  }

  async addBarcode(productId: string, sellerId: string, data: { barcode: string; type?: string }) {
    await this.findOne(productId, sellerId);
    const [bc] = await this.db.insert(productBarcodes).values({
      productId, barcode: data.barcode, type: data.type || 'ean13',
    }).returning();
    return bc;
  }

  async incrementViews(id: string) {
    const [product] = await this.db.update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, id))
      .returning();
    return product;
  }
}
