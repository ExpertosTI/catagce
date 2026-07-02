import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { products, productMedia, productCategories, stockLevels, warehouses } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
    const rows = await this.db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      unit: products.unit,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
      isActive: products.isActive,
      categoryId: products.categoryId,
      imageUrl: productMedia.url,
    })
      .from(products)
      .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.isPrimary, true)))
      .where(eq(products.companyId, user.companyId))
      .orderBy(desc(products.createdAt));

    return rows;
  }

  async getById(user: AuthUser, id: string) {
    const [product] = await this.db.select().from(products)
      .where(and(eq(products.id, id), eq(products.companyId, user.companyId))).limit(1);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const media = await this.db.select().from(productMedia)
      .where(eq(productMedia.productId, id)).orderBy(productMedia.sortOrder);

    const stock = await this.db.select({
      warehouseId: stockLevels.warehouseId,
      warehouseName: warehouses.name,
      totalQty: stockLevels.totalQty,
      reservedQty: stockLevels.reservedQty,
      dispatchedQty: stockLevels.dispatchedQty,
      availableQty: stockLevels.totalQty,
    })
      .from(stockLevels)
      .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
      .where(and(eq(stockLevels.productId, id), eq(stockLevels.companyId, user.companyId)));

    const stockWithAvailable = stock.map((s: any) => ({
      ...s,
      availableQty: s.totalQty - s.reservedQty - s.dispatchedQty,
    }));

    return { ...product, media, stock: stockWithAvailable };
  }

  async create(user: AuthUser, data: {
    sku: string; name: string; description?: string; unit?: string;
    salePrice: number; costPrice?: number; categoryId?: string; imageUrl?: string;
  }) {
    const [product] = await this.db.insert(products).values({
      companyId: user.companyId,
      sku: data.sku.trim(),
      name: data.name.trim(),
      description: data.description,
      unit: data.unit ?? 'un',
      salePrice: data.salePrice.toFixed(2),
      costPrice: data.costPrice?.toFixed(2),
      categoryId: data.categoryId,
    }).returning();

    if (data.imageUrl) {
      await this.db.insert(productMedia).values({
        productId: product.id, url: data.imageUrl, isPrimary: true,
      });
    }

    const [wh] = await this.db.select().from(warehouses)
      .where(and(eq(warehouses.companyId, user.companyId), eq(warehouses.isDefault, true))).limit(1);
    if (wh) {
      await this.db.insert(stockLevels).values({
        companyId: user.companyId, productId: product.id, warehouseId: wh.id,
        totalQty: 0, reservedQty: 0, dispatchedQty: 0,
      });
    }

    return this.getById(user, product.id);
  }

  async listCategories(user: AuthUser) {
    return this.db.select().from(productCategories)
      .where(eq(productCategories.companyId, user.companyId));
  }
}
