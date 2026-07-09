import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiToolsService } from './ai-tools.service';
import { ProductsModule } from '../products/products.module';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SellersModule } from '../sellers/sellers.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    ProductsModule,
    CatalogsModule,
    OrdersModule,
    InventoryModule,
    AnalyticsModule,
    IntegrationsModule,
    SellersModule,
    WebhooksModule,
  ],
  controllers: [AiController],
  providers: [AiAssistantService, AiToolsService],
  exports: [AiToolsService],
})
export class AiModule {}
