import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { companies, catalogs, catalogProducts, products, productMedia } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';

@Injectable()
export class PublicService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getCompany(slug: string) {
    const [company] = await this.db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      email: companies.email,
      phone: companies.phone,
      address: companies.address,
      logoUrl: companies.logoUrl,
    }).from(companies).where(eq(companies.slug, slug.trim().toLowerCase())).limit(1);
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async listCatalogs(companySlug: string) {
    const company = await this.getCompany(companySlug);
    return this.db.select({
      id: catalogs.id,
      name: catalogs.name,
      slug: catalogs.slug,
      description: catalogs.description,
      isPresale: catalogs.isPresale,
      coverImageUrl: catalogs.coverImageUrl,
    })
      .from(catalogs)
      .where(and(eq(catalogs.companyId, company.id), eq(catalogs.isPublic, true)))
      .orderBy(desc(catalogs.createdAt));
  }

  async getCatalog(companySlug: string, catalogSlug: string) {
    const company = await this.getCompany(companySlug);
    const [catalog] = await this.db.select().from(catalogs)
      .where(and(
        eq(catalogs.companyId, company.id),
        eq(catalogs.slug, catalogSlug),
        eq(catalogs.isPublic, true),
      )).limit(1);
    if (!catalog) throw new NotFoundException('Catálogo no encontrado');

    const items = await this.db.select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      unit: products.unit,
      displayPrice: catalogProducts.displayPrice,
      salePrice: products.salePrice,
      imageUrl: productMedia.url,
    })
      .from(catalogProducts)
      .innerJoin(products, eq(catalogProducts.productId, products.id))
      .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.isPrimary, true)))
      .where(eq(catalogProducts.catalogId, catalog.id))
      .orderBy(catalogProducts.sortOrder);

    return {
      company: { name: company.name, slug: company.slug, phone: company.phone, email: company.email },
      catalog: {
        id: catalog.id,
        name: catalog.name,
        slug: catalog.slug,
        description: catalog.description,
        isPresale: catalog.isPresale,
        coverImageUrl: catalog.coverImageUrl,
      },
      items: items.map((i: any) => ({
        ...i,
        price: parseFloat(i.displayPrice ?? i.salePrice ?? '0'),
      })),
    };
  }
}
