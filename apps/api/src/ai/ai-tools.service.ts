import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { SellersService } from '../sellers/sellers.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class AiToolsService {
  constructor(
    private products: ProductsService,
    private catalogs: CatalogsService,
    private orders: OrdersService,
    private inventory: InventoryService,
    private analytics: AnalyticsService,
    private integrations: IntegrationsService,
    private sellers: SellersService,
    private webhooks: WebhooksService,
  ) {}

  async execute(toolName: string, args: Record<string, unknown>, sellerId: string, userId: string) {
    try {
      switch (toolName) {
        case 'list_products':
          return await this.products.findAll(sellerId);

        case 'get_product':
          return await this.products.findOne(args.productId as string, sellerId);

        case 'create_product': {
          const warehouses = await this.inventory.getWarehouses(sellerId);
          const uoms = await this.inventory.getUoms(sellerId);
          return await this.products.create(sellerId, {
            ...args,
            baseUomId: uoms[0]?.id,
            warehouseId: warehouses.find((w: any) => w.isDefault)?.id || warehouses[0]?.id,
          }, userId);
        }

        case 'update_product':
          return await this.products.update(args.productId as string, sellerId, args, userId);

        case 'list_catalogs':
          return await this.catalogs.findAll(sellerId);

        case 'create_catalog':
          return await this.catalogs.create(sellerId, args as any);

        case 'publish_catalog':
          return await this.catalogs.publish(args.catalogId as string, sellerId);

        case 'list_orders':
          return await this.orders.findAll(sellerId);

        case 'update_order_status':
          return await this.orders.updateStatus(args.orderId as string, sellerId, args.status as string, userId);

        case 'get_inventory':
          return await this.inventory.getStockLevels(sellerId);

        case 'get_low_stock':
          return await this.inventory.getLowStock(sellerId);

        case 'adjust_stock': {
          const warehouses = await this.inventory.getWarehouses(sellerId);
          const wh = warehouses.find((w: any) => w.isDefault) || warehouses[0];
          return await this.inventory.adjustStock(sellerId, {
            warehouseId: wh.id,
            productId: args.productId as string,
            quantity: args.quantity as number,
            notes: args.notes as string,
            actorUserId: userId,
          });
        }

        case 'inbound_stock': {
          const warehouses = await this.inventory.getWarehouses(sellerId);
          const wh = warehouses.find((w: any) => w.isDefault) || warehouses[0];
          return await this.inventory.inbound(sellerId, {
            warehouseId: wh.id,
            productId: args.productId as string,
            quantity: args.quantity as number,
            notes: args.notes as string,
            actorUserId: userId,
          });
        }

        case 'get_analytics':
          return await this.analytics.getDashboard(sellerId);

        case 'list_integrations':
          return await this.integrations.findAll(sellerId);

        case 'sync_integration':
          return await this.integrations.sync(args.integrationId as string, sellerId);

        case 'update_branding':
          return await this.sellers.updateBranding(sellerId, args as any);

        case 'create_webhook':
          return await this.webhooks.create(sellerId, args as { url: string; events: string[] });

        case 'get_seller_profile':
          return await this.sellers.getProfile(sellerId);

        default:
          return { error: `Herramienta desconocida: ${toolName}` };
      }
    } catch (err: any) {
      return { error: err.message || 'Error ejecutando acción' };
    }
  }
}
