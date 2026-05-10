import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { catalogs, catalogProducts } from '@catagce/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class CatalogsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async findAll(sellerId: string) {
    return this.db.query.catalogs.findMany({
      where: eq(catalogs.sellerId, sellerId),
      with: {
        catalogProducts: {
          with: {
            product: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.catalogs.findFirst({
      where: eq(catalogs.slug, slug),
      with: {
        catalogProducts: {
          with: {
            product: true,
          },
        },
      },
    });
  }

  async create(sellerId: string, data: any) {
    const [catalog] = await this.db.insert(catalogs).values({
      ...data,
      sellerId,
    }).returning();
    return catalog;
  }
}
