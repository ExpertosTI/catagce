import { Injectable, Inject, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { catalogs, catalogProducts, products, productMedia, presales, presaleItems, clients, invoices } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { InvoicesService } from '../invoices/invoices.service';

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
  constructor(
    @Inject(DRIZZLE) private db: any,
    @Inject(forwardRef(() => InvoicesService)) private invoicesService: InvoicesService,
  ) {}

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

  async getById(user: AuthUser, id: string) {
    const [presale] = await this.db.select({
      id: presales.id,
      reference: presales.reference,
      status: presales.status,
      totalAmount: presales.totalAmount,
      notes: presales.notes,
      clientId: presales.clientId,
      catalogId: presales.catalogId,
      createdAt: presales.createdAt,
      clientName: clients.name,
      clientPhone: clients.phone,
      clientEmail: clients.email,
    })
      .from(presales)
      .innerJoin(clients, eq(presales.clientId, clients.id))
      .where(and(eq(presales.id, id), eq(presales.companyId, user.companyId)))
      .limit(1);

    if (!presale) throw new NotFoundException('Preventa no encontrada');

    const items = await this.db.select({
      id: presaleItems.id,
      productId: presaleItems.productId,
      quantity: presaleItems.quantity,
      unitPrice: presaleItems.unitPrice,
      lineTotal: presaleItems.lineTotal,
      productName: products.name,
      productSku: products.sku,
    })
      .from(presaleItems)
      .innerJoin(products, eq(presaleItems.productId, products.id))
      .where(eq(presaleItems.presaleId, id));

    let invoiceId: string | null = null;
    if (presale.status === 'converted') {
      const [inv] = await this.db.select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.presaleId, id), eq(invoices.companyId, user.companyId)))
        .limit(1);
      invoiceId = inv?.id ?? null;
    }

    return { ...presale, items, invoiceId };
  }

  async confirm(user: AuthUser, id: string) {
    const presale = await this.getById(user, id);
    if (presale.status !== 'open') {
      throw new BadRequestException('Solo se pueden confirmar preventas abiertas');
    }
    await this.db.update(presales)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(presales.id, id));
    return this.getById(user, id);
  }

  async cancel(user: AuthUser, id: string) {
    const presale = await this.getById(user, id);
    if (!['open', 'confirmed'].includes(presale.status)) {
      throw new BadRequestException('Esta preventa ya no se puede cancelar');
    }
    await this.db.update(presales)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(presales.id, id));
    return this.getById(user, id);
  }

  async convertToInvoice(user: AuthUser, id: string, data?: {
    invoiceType?: 'cash' | 'credit';
    isFiscal?: boolean;
    comprobanteType?: string;
    issue?: boolean;
  }) {
    const presale = await this.getById(user, id);
    if (presale.status === 'converted') {
      throw new BadRequestException('Esta preventa ya fue convertida a factura');
    }
    if (presale.status === 'cancelled') {
      throw new BadRequestException('No se puede facturar una preventa cancelada');
    }
    if (!presale.items.length) {
      throw new BadRequestException('La preventa no tiene productos');
    }

    const invoice = await this.invoicesService.create(user, {
      clientId: presale.clientId,
      invoiceType: data?.invoiceType ?? 'credit',
      isFiscal: data?.isFiscal !== false,
      comprobanteType: data?.comprobanteType as any,
      issue: data?.issue !== false,
      notes: presale.notes ? `Preventa ${presale.reference}${presale.notes ? ` — ${presale.notes}` : ''}` : `Preventa ${presale.reference}`,
      presaleId: id,
      items: presale.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
      })),
    });

    await this.db.update(presales)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(eq(presales.id, id));

    return { presale: await this.getById(user, id), invoice };
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
