import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { products } from '@catagce/db';
import { eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('media') private mediaQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.products.findMany({
      where: eq(products.sellerId, sellerId),
      with: {
        stockLevels: true,
      },
    });
  }

  async create(sellerId: string, data: any) {
    const [product] = await this.db.insert(products).values({
      ...data,
      sellerId,
      minOrderQuantity: data.minOrderQuantity || '1',
      b2bPrice: data.b2bPrice || null,
    }).returning();

    // Trigger Superpower: Media Processing (OCR + BG Removal)
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
    const [product] = await this.db.update(products)
      .set({ 
        views: this.db.raw('views + 1') 
      })
      .where(eq(products.id, id))
      .returning();
    return product;
  }
}
