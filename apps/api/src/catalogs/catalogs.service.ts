import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { catalogs, catalogProducts, products, productMedia, presales, presaleItems, clients } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class CatalogsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
    return this.db.select().from(catalogs)
      .where(eq(catalogs.companyId, user.companyId))
      .orderBy(desc(catalogs.createdAt));
  }

  async getBySlug(companySlug: string, slug: string) {
    const rows = await this.db.select({
      catalog: catalogs,
      companySlug: catalogs.slug,
    }).from(catalogs).where(eq(catalogs.slug, slug)).limit(1);

    const [cat] = rows;
    if (!cat) throw new NotFoundException('Catálogo no encontrado');

    const items = await this.db.select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      displayPrice: catalogProducts.displayPrice,
      imageUrl: productMedia.url,
    })
      .from(catalogProducts)
      .innerJoin(products, eq(catalogProducts.productId, products.id))
      .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.isPrimary, true)))
      .where(eq(catalogProducts.catalogId, cat.catalog.id));

    return { ...cat.catalog, items };
  }

  async create(user: AuthUser, data: {
    name: string; slug: string; description?: string;
    isPresale?: boolean; isPublic?: boolean; productIds?: string[];
  }) {
    const [catalog] = await this.db.insert(catalogs).values({
      companyId: user.companyId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      isPresale: data.isPresale ?? false,
      isPublic: data.isPublic ?? false,
    }).returning();

    if (data.productIds?.length) {
      for (let i = 0; i < data.productIds.length; i++) {
        await this.db.insert(catalogProducts).values({
          catalogId: catalog.id,
          productId: data.productIds[i],
          sortOrder: i,
        });
      }
    }

    return catalog;
  }
}

@Injectable()
export class PresalesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
    return this.db.select({
      id: presales.id,
      reference: presales.reference,
      status: presales.status,
      totalAmount: presales.totalAmount,
      clientName: clients.name,
      createdAt: presales.createdAt,
    })
      .from(presales)
      .innerJoin(clients, eq(presales.clientId, clients.id))
      .where(eq(presales.companyId, user.companyId))
      .orderBy(desc(presales.createdAt));
  }

  async create(user: AuthUser, data: {
    clientId: string; catalogId?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
  }) {
    const reference = `PRE-${Date.now().toString(36).toUpperCase()}`;
    let total = 0;
    const lineItems = data.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      total += lineTotal;
      return { ...item, lineTotal };
    });

    const [presale] = await this.db.insert(presales).values({
      companyId: user.companyId,
      clientId: data.clientId,
      catalogId: data.catalogId,
      reference,
      totalAmount: total.toFixed(2),
      notes: data.notes,
    }).returning();

    for (const item of lineItems) {
      await this.db.insert(presaleItems).values({
        presaleId: presale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
      });
    }

    return presale;
  }
}
