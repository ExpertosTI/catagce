import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { products, productVariants, productBarcodes, productMedia, stockLevels } from '@catagce/db';
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
      where: eq(products.sellerId, sellerId),
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
    const [product] = await this.db.insert(products).values({
      sellerId,
      name: data.name,
      sku: data.sku,
      description: data.description,
      category: data.category,
      baseUomId: data.baseUomId,
      basePrice: String(data.basePrice),
      b2bPrice: data.b2bPrice ? String(data.b2bPrice) : null,
      minOrderQuantity: data.minOrderQuantity ? String(data.minOrderQuantity) : '1',
      imageUrl: data.imageUrl,
      isActive: data.isActive ?? true,
    }).returning();

    if (data.initialStock && data.warehouseId) {
      await this.db.insert(stockLevels).values({
        sellerId, warehouseId: data.warehouseId, productId: product.id,
        onHandBase: String(data.initialStock),
      });
    }

    if (product.imageUrl) {
      await this.mediaQueue.add('process-product-media', {
        productId: product.id, imageUrl: product.imageUrl, sellerId,
      });
    }

    await this.webhookDispatcher.dispatch(sellerId, 'product.created', { product });
    await this.auditService.log({
      sellerId, actorUserId, action: 'product.created',
      entityType: 'product', entityId: product.id,
    });

    return product;
  }

  async update(id: string, sellerId: string, data: any, actorUserId?: string) {
    await this.findOne(id, sellerId);
    const [product] = await this.db.update(products)
      .set({ ...data, basePrice: data.basePrice ? String(data.basePrice) : undefined,
        b2bPrice: data.b2bPrice ? String(data.b2bPrice) : undefined, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId)))
      .returning();

    await this.webhookDispatcher.dispatch(sellerId, 'product.updated', { product });
    await this.auditService.log({
      sellerId, actorUserId, action: 'product.updated',
      entityType: 'product', entityId: id, changes: data,
    });

    return product;
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
