import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { catalogs, catalogProducts, products } from '@catagce/db';
import { and, eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CatalogsService {
  private readonly logger = new Logger(CatalogsService.name);

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
      orderBy: (c: any, { desc }: any) => [desc(c.createdAt)],
    });
  }

  async findBySlug(slug: string) {
    if (!slug || slug.length < 2) throw new BadRequestException('slug requerido');
    const catalog = await this.db.query.catalogs.findFirst({
      where: and(eq(catalogs.slug, slug), eq(catalogs.isActive, true)),
      with: {
        catalogProducts: {
          with: { product: true },
        },
        seller: { with: { branding: true } },
      },
    });
    if (!catalog) throw new NotFoundException('Catalog not found');
    return catalog;
  }

  async create(sellerId: string, data: { name: string; slug: string; description?: string; isActive?: boolean }) {
    // Catalog slugs are globally unique — pre-check for a friendlier error.
    const [existing] = await this.db
      .select({ id: catalogs.id })
      .from(catalogs)
      .where(eq(catalogs.slug, data.slug))
      .limit(1);
    if (existing) throw new BadRequestException('Ya existe un catálogo con ese slug');

    const [created] = await this.db
      .insert(catalogs)
      .values({
        sellerId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      })
      .returning();
    return created;
  }

  async addProduct(sellerId: string, catalogId: string, productId: string) {
    const [cat] = await this.db
      .select()
      .from(catalogs)
      .where(and(eq(catalogs.id, catalogId), eq(catalogs.sellerId, sellerId)))
      .limit(1);
    if (!cat) throw new NotFoundException('Catalog not found');

    const [prod] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
      .limit(1);
    if (!prod) throw new NotFoundException('Product not found');

    const existing = await this.db
      .select()
      .from(catalogProducts)
      .where(and(eq(catalogProducts.catalogId, catalogId), eq(catalogProducts.productId, productId)))
      .limit(1);
    if (existing.length) return existing[0];

    const [created] = await this.db
      .insert(catalogProducts)
      .values({ catalogId, productId })
      .returning();
    return created;
  }

  async removeProduct(sellerId: string, catalogId: string, productId: string) {
    const [cat] = await this.db
      .select()
      .from(catalogs)
      .where(and(eq(catalogs.id, catalogId), eq(catalogs.sellerId, sellerId)))
      .limit(1);
    if (!cat) throw new NotFoundException('Catalog not found');

    await this.db
      .delete(catalogProducts)
      .where(and(eq(catalogProducts.catalogId, catalogId), eq(catalogProducts.productId, productId)));
    return { ok: true };
  }

  async enqueuePdfRender(sellerId: string, catalogId: string) {
    const [cat] = await this.db
      .select()
      .from(catalogs)
      .where(and(eq(catalogs.id, catalogId), eq(catalogs.sellerId, sellerId)))
      .limit(1);
    if (!cat) throw new NotFoundException('Catalog not found');

    const job = await this.renderQueue.add(
      'render-pdf',
      { catalogId, sellerId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 50, removeOnFail: 200 },
    );
    return { jobId: job.id, status: 'queued' };
  }
}
