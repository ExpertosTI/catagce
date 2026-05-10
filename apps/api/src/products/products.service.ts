import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { products } from '@catagce/db';
import { eq, sql } from 'drizzle-orm';
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

  async create(sellerId: string, data: any) {
    const [product] = await this.db
      .insert(products)
      .values({
        ...data,
        sellerId,
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
