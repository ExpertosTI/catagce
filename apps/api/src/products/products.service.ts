import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { products, productMedia, productCategories, stockLevels, warehouses, stockMovements } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { generateWithGemini } from '../ai/gemini.util';
import { getCompanyGeminiKey } from '../ai/company-ai.util';

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
      minStock: products.minStock,
      isActive: products.isActive,
      categoryId: products.categoryId,
      imageUrl: productMedia.url,
    })
      .from(products)
      .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.isPrimary, true)))
      .where(and(eq(products.companyId, user.companyId), eq(products.isActive, true)))
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
    stockQty?: number; minStock?: number;
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
      minStock: data.minStock ?? 0,
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
      if (data.stockQty && data.stockQty > 0) {
        await this.adjustStock(user, product.id, {
          warehouseId: wh.id, delta: data.stockQty, reason: 'Inventario inicial', type: 'adjustment',
        });
      }
    }

    return this.getById(user, product.id);
  }

  async listCategories(user: AuthUser) {
    return this.db.select().from(productCategories)
      .where(eq(productCategories.companyId, user.companyId));
  }

  async update(user: AuthUser, id: string, data: {
    sku?: string; name?: string; description?: string; unit?: string;
    salePrice?: number; costPrice?: number; categoryId?: string; imageUrl?: string;
    minStock?: number;
  }) {
    await this.getById(user, id);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.sku !== undefined) updates.sku = data.sku.trim();
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description;
    if (data.unit !== undefined) updates.unit = data.unit;
    if (data.salePrice !== undefined) updates.salePrice = data.salePrice.toFixed(2);
    if (data.costPrice !== undefined) updates.costPrice = data.costPrice.toFixed(2);
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
    if (data.minStock !== undefined) updates.minStock = data.minStock;

    await this.db.update(products).set(updates).where(and(eq(products.id, id), eq(products.companyId, user.companyId)));

    if (data.imageUrl !== undefined) {
      const [existing] = await this.db.select().from(productMedia)
        .where(and(eq(productMedia.productId, id), eq(productMedia.isPrimary, true))).limit(1);
      if (data.imageUrl) {
        if (existing) {
          await this.db.update(productMedia).set({ url: data.imageUrl }).where(eq(productMedia.id, existing.id));
        } else {
          await this.db.insert(productMedia).values({ productId: id, url: data.imageUrl, isPrimary: true });
        }
      }
    }

    return this.getById(user, id);
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id);
    await this.db.update(products).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.companyId, user.companyId)));
    return { ok: true, message: 'Producto eliminado' };
  }

  async adjustStock(user: AuthUser, productId: string, data: {
    warehouseId?: string; delta: number; reason?: string; type?: 'adjustment' | 'correction' | 'return';
  }) {
    await this.getById(user, productId);
    if (!data.delta) throw new BadRequestException('La cantidad de ajuste no puede ser cero');

    const conditions = [eq(stockLevels.companyId, user.companyId), eq(stockLevels.productId, productId)];
    if (data.warehouseId) conditions.push(eq(stockLevels.warehouseId, data.warehouseId));

    const [stock] = await this.db.select().from(stockLevels).where(and(...conditions)).limit(1);
    if (!stock) throw new NotFoundException('No se encontró inventario para este producto en el almacén indicado');

    const newQty = stock.totalQty + data.delta;
    if (newQty < 0) {
      throw new BadRequestException(`El ajuste dejaría el inventario en negativo (actual: ${stock.totalQty})`);
    }

    await this.db.update(stockLevels).set({ totalQty: newQty, updatedAt: new Date() })
      .where(eq(stockLevels.id, stock.id));

    await this.db.insert(stockMovements).values({
      companyId: user.companyId,
      productId,
      warehouseId: stock.warehouseId,
      type: data.type ?? 'adjustment',
      quantityChange: data.delta,
      resultingQty: newQty,
      reason: data.reason,
      staffId: user.userId,
    });

    return this.getById(user, productId);
  }

  async listStockMovements(user: AuthUser, productId: string) {
    await this.getById(user, productId);
    return this.db.select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantityChange: stockMovements.quantityChange,
      resultingQty: stockMovements.resultingQty,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
      warehouseName: warehouses.name,
    })
      .from(stockMovements)
      .innerJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
      .where(and(eq(stockMovements.companyId, user.companyId), eq(stockMovements.productId, productId)))
      .orderBy(desc(stockMovements.createdAt))
      .limit(30);
  }

  async generateDescription(user: AuthUser, name: string, category?: string) {
    const prompt = `Escribe una descripción de venta corta (máximo 40 palabras), en español, persuasiva y profesional para este producto de electrodomésticos/hogar: "${name}"${category ? ` (categoría: ${category})` : ''}. No uses emojis ni comillas.`;
    const geminiKey = await getCompanyGeminiKey(this.db, user.companyId);
    const text = await generateWithGemini(prompt, undefined, geminiKey);
    if (text) return { description: text, source: 'ai' };
    return {
      description: `${name} de excelente calidad, ideal para el hogar. Producto importado con garantía, listo para entrega inmediata en Santo Domingo.`,
      source: 'template',
    };
  }
}
