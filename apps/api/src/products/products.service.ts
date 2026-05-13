import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Database, DRIZZLE } from '../database/database.module';
import { products, uoms } from '@catagce/db';
import { eq, sql, and } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @InjectQueue('media') private readonly mediaQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    try {
      return await this.db.query.products.findMany({
        where: eq(products.sellerId, sellerId),
        with: {
          stockLevels: true,
          baseUom: true,
        },
      });
    } catch (e: any) {
      // Fallback if relational query fails (e.g. legacy schema): plain select.
      this.logger.warn(`Relational findMany failed, falling back: ${e.message}`);
      try {
        const rows = await this.db
          .select()
          .from(products)
          .where(eq(products.sellerId, sellerId));
        return rows.map((r: any) => ({ ...r, stockLevels: [], baseUom: null }));
      } catch (err: any) {
        this.logger.error(`Products findAll failed: ${err.message}`);
        return [];
      }
    }
  }

  private async resolveDefaultUom(sellerId: string): Promise<number> {
    const existing = await this.db
      .select()
      .from(uoms)
      .where(and(eq(uoms.sellerId, sellerId), eq(uoms.symbol, 'un')))
      .limit(1);
    if (existing.length) return existing[0].id;
    const [created] = await this.db
      .insert(uoms)
      .values({ sellerId, name: 'Unidad', symbol: 'un', conversionFactor: '1.0000' })
      .returning();
    return created.id;
  }

  async create(sellerId: string, data: any) {
    if (!data?.name || data?.basePrice == null) {
      throw new BadRequestException('name y basePrice son requeridos');
    }

    const baseUomId = data.baseUomId ?? (await this.resolveDefaultUom(sellerId));

    let product: any;
    try {
      [product] = await this.db
        .insert(products)
        .values({
          name: String(data.name).trim(),
          sku: data.sku ?? null,
          description: data.description ?? null,
          basePrice: String(data.basePrice),
          b2bPrice: data.b2bPrice ? String(data.b2bPrice) : null,
          minOrderQuantity: data.minOrderQuantity || '1.0000',
          isActive: data.isActive ?? true,
          imageUrl: data.imageUrl ?? null,
          sellerId,
          baseUomId,
        })
        .returning();
    } catch (e: any) {
      this.logger.error(`Product insert failed: ${e.message}`);
      throw new BadRequestException(`No se pudo crear el producto: ${e.message}`);
    }

    if (product?.imageUrl) {
      try {
        await this.mediaQueue.add(
          'process-product-media',
          { productId: product.id, imageUrl: product.imageUrl, sellerId },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 },
        );
      } catch (e: any) {
        this.logger.warn(`Media queue enqueue failed: ${e.message}`);
      }
    }

    return product;
  }

  async incrementViews(id: string) {
    try {
      const [product] = await this.db
        .update(products)
        .set({ views: sql`${products.views} + 1` })
        .where(eq(products.id, id))
        .returning();
      return product ?? null;
    } catch (e: any) {
      this.logger.warn(`incrementViews failed: ${e.message}`);
      return null;
    }
  }

  async remove(sellerId: string, id: string) {
    try {
      await this.db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.sellerId, sellerId)));
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`Product remove failed: ${e.message}`);
      throw new BadRequestException(`No se pudo eliminar el producto: ${e.message}`);
    }
  }
}
