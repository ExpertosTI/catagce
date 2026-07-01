import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  catalogPublications,
  catalogs,
  orders,
  orderItems,
  products,
  sellerBranding,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PublicService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private ordersService: OrdersService,
  ) {}

  async getCatalogByToken(token: string) {
    const publication = await this.db.query.catalogPublications.findFirst({
      where: eq(catalogPublications.token, token),
      with: {
        catalog: {
          with: {
            catalogProducts: { with: { product: { with: { stockLevels: true } } } },
            seller: { with: { branding: true, settings: true } },
          },
        },
      },
    });

    if (!publication || !publication.isActive) {
      throw new NotFoundException('Catálogo no encontrado o inactivo');
    }

    if (publication.expiresAt && new Date(publication.expiresAt) < new Date()) {
      throw new NotFoundException('Este enlace de catálogo ha expirado');
    }

    await this.db
      .update(catalogPublications)
      .set({ viewCount: (publication.viewCount || 0) + 1 })
      .where(eq(catalogPublications.id, publication.id));

    return {
      catalog: publication.catalog,
      branding: publication.catalog?.seller?.branding,
      seller: publication.catalog?.seller,
      whatsappNumber:
        publication.catalog?.seller?.settings?.whatsappNumber
        || publication.catalog?.seller?.phone
        || null,
      token: publication.token,
    };
  }

  async createOrder(data: {
    token: string;
    buyerName: string;
    buyerPhone: string;
    items: Array<{ productId: string; quantity: number }>;
    notes?: string;
  }) {
    const publication = await this.db.query.catalogPublications.findFirst({
      where: eq(catalogPublications.token, data.token),
      with: { catalog: true },
    });

    if (!publication?.catalog) {
      throw new NotFoundException('Token de catálogo inválido');
    }

    if (!data.items?.length) {
      throw new BadRequestException('El pedido debe incluir al menos un producto');
    }

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of data.items) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);

      const unitPrice = parseFloat(product.b2bPrice || product.basePrice);
      totalAmount += unitPrice * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        quantity: String(item.quantity),
        unitPrice: String(unitPrice),
      });
    }

    const order = await this.ordersService.create({
      sellerId: publication.catalog.sellerId,
      catalogId: publication.catalog.id,
      publicationToken: data.token,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      totalAmount: String(totalAmount.toFixed(2)),
      notes: data.notes,
      items: orderItemsData,
    });

    return order;
  }
}
