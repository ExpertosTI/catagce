import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { catalogs } from '@catagce/db';
import { and, eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CatalogsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('catalog-render') private readonly renderQueue: Queue,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.catalogs.findMany({
      where: eq(catalogs.sellerId, sellerId),
      with: {
        catalogProducts: {
          with: { product: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const catalog = await this.db.query.catalogs.findFirst({
      where: and(eq(catalogs.slug, slug), eq(catalogs.isActive, true)),
      with: {
        catalogProducts: {
          with: { product: true },
        },
      },
    });

    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    return catalog;
  }

  async create(sellerId: string, data: any) {
    const [catalog] = await this.db
      .insert(catalogs)
      .values({ ...data, sellerId })
      .returning();
    return catalog;
  }

  async enqueuePdfRender(catalogId: string, sellerId: string) {
    return this.renderQueue.add('render-pdf', { catalogId, sellerId });
  }
}
