import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { catalogs, catalogProducts, products } from '@catagce/db';
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
        seller: {
          with: { branding: true }
        }
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

  async addProduct(sellerId: string, catalogId: string, productId: string) {
    const [cat] = await this.db.select().from(catalogs).where(and(eq(catalogs.id, catalogId), eq(catalogs.sellerId, sellerId))).limit(1);
    if (!cat) throw new NotFoundException('Catalog not found');
    const [prod] = await this.db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, sellerId))).limit(1);
    if (!prod) throw new NotFoundException('Product not found');
    const existing = await this.db.select().from(catalogProducts).where(and(eq(catalogProducts.catalogId, catalogId), eq(catalogProducts.productId, productId))).limit(1);
    if (existing.length) return existing[0];
    const [created] = await this.db.insert(catalogProducts).values({ catalogId, productId }).returning();
    return created;
  }

  async removeProduct(sellerId: string, catalogId: string, productId: string) {
    const [cat] = await this.db.select().from(catalogs).where(and(eq(catalogs.id, catalogId), eq(catalogs.sellerId, sellerId))).limit(1);
    if (!cat) throw new NotFoundException('Catalog not found');
    await this.db.delete(catalogProducts).where(and(eq(catalogProducts.catalogId, catalogId), eq(catalogProducts.productId, productId)));
    return { ok: true };
  }

  async enqueuePdfRender(catalogId: string, sellerId: string) {
    return this.renderQueue.add('render-pdf', { catalogId, sellerId });
  }
}
