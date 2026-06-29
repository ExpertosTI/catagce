import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OdooService } from './odoo.service';
import { ShopifyService } from './shopify.service';
import { WooCommerceService } from './woocommerce.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OdooService, ShopifyService, WooCommerceService, WebhookDispatcherService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
