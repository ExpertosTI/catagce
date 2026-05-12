import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { products, uoms } from '@catagce/db';
import { eq, sql, and } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('media') private readonly mediaQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.products.findMany({
      where: eq(products.sellerId, sellerId),
      with: {
        stockLevels: true,
        baseUom: true,
      },
    });
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
    const baseUomId = data.baseUomId ?? await this.resolveDefaultUom(sellerId);
    const [product] = await this.db
      .insert(products)
      .values({
        ...data,
        sellerId,
        baseUomId,
        minOrderQuantity: data.minOrderQuantity || '1.0000',
        b2bPrice: data.b2bPrice || null,
      })
      .returning();

    if (product.imageUrl) {
      await this.mediaQueue.add('process-product-media', {
        productId: product.id,
        imageUrl: product.imageUrl,
        sellerId,
      });
    }

    return product;
  }

  async incrementViews(id: string) {
    const [product] = await this.db
      .update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, id))
      .returning();
    return product;
  }
}
