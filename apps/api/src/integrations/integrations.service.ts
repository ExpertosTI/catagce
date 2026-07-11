import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { integrations, products, stockLevels, warehouses, uoms, integrationLogs } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { OdooService, OdooConfig } from './odoo.service';
import { ShopifyService, ShopifyConfig } from './shopify.service';
import { WooCommerceService, WooCommerceConfig } from './woocommerce.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';

interface ExternalProduct {
  externalId: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  basePrice: string;
  imageUrl?: string | null;
  qty?: number;
  category?: string | null;
}

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private odooService: OdooService,
    private shopifyService: ShopifyService,
    private wooService: WooCommerceService,
    private webhookDispatcher: WebhookDispatcherService,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.integrations.findMany({ where: eq(integrations.sellerId, sellerId) });
  }

  async create(sellerId: string, data: { type: string; name: string; config: Record<string, unknown> }) {
    const [integration] = await this.db.insert(integrations)
      .values({ sellerId, type: data.type, name: data.name, config: data.config }).returning();
    return integration;
  }

  async update(id: string, sellerId: string, data: Partial<{ name: string; config: Record<string, unknown>; isActive: boolean }>) {
    const [integration] = await this.db.update(integrations).set(data)
      .where(and(eq(integrations.id, id), eq(integrations.sellerId, sellerId))).returning();
    if (!integration) throw new NotFoundException('Integración no encontrada');
    return integration;
  }

  async delete(id: string, sellerId: string) {
    await this.db.delete(integrations).where(and(eq(integrations.id, id), eq(integrations.sellerId, sellerId)));
    return { success: true };
  }

  async sync(id: string, sellerId: string) {
    const integration = await this.db.query.integrations.findFirst({
      where: and(eq(integrations.id, id), eq(integrations.sellerId, sellerId)),
    });
    if (!integration) throw new NotFoundException('Integración no encontrada');

    let externalProducts: ExternalProduct[] = [];

    try {
      if (integration.type === 'odoo') {
        const raw = await this.odooService.fetchProducts(integration.config as OdooConfig);
        externalProducts = raw.map((p) => {
          const categ = Array.isArray(p.categ_id) ? String(p.categ_id[1] || '') : '';
          return {
            externalId: String(p.id),
            name: p.name,
            sku: p.default_code ? String(p.default_code) : null,
            description: p.description_sale ? String(p.description_sale) : null,
            basePrice: String(p.list_price || 0),
            qty: p.qty_available,
            category: categ || null,
          };
        });
      } else if (integration.type === 'shopify') {
        externalProducts = await this.shopifyService.fetchProducts(integration.config as ShopifyConfig);
      } else if (integration.type === 'woocommerce') {
        externalProducts = await this.wooService.fetchProducts(integration.config as WooCommerceConfig);
      }

      const synced = await this.upsertExternalProducts(sellerId, integration.type, externalProducts);

      await this.db.update(integrations)
        .set({ lastSyncAt: new Date(), lastSyncStatus: `synced:${synced}` })
        .where(eq(integrations.id, id));

      await this.db.insert(integrationLogs).values({
        integrationId: id, level: 'info', message: `Sincronizados ${synced} productos`,
      });

      await this.webhookDispatcher.dispatch(sellerId, 'integration.synced', {
        integrationId: id, type: integration.type, productsSynced: synced,
      });

      return { synced, status: 'success' };
    } catch (err: any) {
      await this.db.insert(integrationLogs).values({
        integrationId: id, level: 'error', message: err.message,
      });
      throw err;
    }
  }

  private async upsertExternalProducts(sellerId: string, source: string, items: ExternalProduct[]) {
    const defaultWarehouse = await this.db.query.warehouses.findFirst({ where: eq(warehouses.sellerId, sellerId) });
    const defaultUom = await this.db.query.uoms.findFirst({ where: eq(uoms.sellerId, sellerId) });
    if (!defaultUom) throw new Error('No hay unidad de medida configurada');

    let synced = 0;
    for (const item of items) {
      const existing = await this.db.query.products.findFirst({
        where: and(eq(products.sellerId, sellerId), eq(products.externalId, item.externalId)),
      });

      const productData = {
        name: item.name, sku: item.sku, description: item.description,
        basePrice: item.basePrice, imageUrl: item.imageUrl,
        category: item.category ?? null,
        externalId: item.externalId, externalSource: source,
      };

      let productId: string;
      if (existing) {
        const [updated] = await this.db.update(products)
          .set({ ...productData, updatedAt: new Date() }).where(eq(products.id, existing.id)).returning();
        productId = updated.id;
      } else {
        const [created] = await this.db.insert(products)
          .values({ ...productData, sellerId, baseUomId: defaultUom.id }).returning();
        productId = created.id;
      }

      if (defaultWarehouse && item.qty !== undefined) {
        const stock = await this.db.query.stockLevels.findFirst({
          where: and(eq(stockLevels.productId, productId), eq(stockLevels.warehouseId, defaultWarehouse.id)),
        });
        const stockValue = String(item.qty);
        if (stock) {
          await this.db.update(stockLevels).set({ onHandBase: stockValue, updatedAt: new Date() })
            .where(eq(stockLevels.id, stock.id));
        } else {
          await this.db.insert(stockLevels).values({
            sellerId, warehouseId: defaultWarehouse.id, productId, onHandBase: stockValue,
          });
        }
      }
      synced++;
    }
    return synced;
  }
}
