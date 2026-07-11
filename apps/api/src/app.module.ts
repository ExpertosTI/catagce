import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { OrdersModule } from './orders/orders.module';
import { SellersModule } from './sellers/sellers.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PublicModule } from './public/public.module';
import { InventoryModule } from './inventory/inventory.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UploadsModule } from './uploads/uploads.module';
import { WhatsAppInboxModule } from './whatsapp-inbox/whatsapp-inbox.module';
import { ContactsModule } from './contacts/contacts.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { WhatsAppConnectModule } from './whatsapp-connect/whatsapp-connect.module';
import { EvolutionWebhookModule } from './evolution-webhook/evolution-webhook.module';
import { OrderSyncModule } from './order-sync/order-sync.module';
import { AuthGuard } from './common/guards/auth.guard';
import { ThrottleGuard } from './common/security/security.util';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProductsModule,
    CatalogsModule,
    OrdersModule,
    SellersModule,
    WebhooksModule,
    IntegrationsModule,
    PublicModule,
    InventoryModule,
    AnalyticsModule,
    AiModule,
    OnboardingModule,
    UploadsModule,
    WhatsAppInboxModule,
    ContactsModule,
    BroadcastModule,
    WhatsAppConnectModule,
    EvolutionWebhookModule,
    OrderSyncModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
      },
    }),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottleGuard },
  ],
})
export class AppModule {}
