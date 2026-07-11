import { Module } from '@nestjs/common';
import { WhatsAppInboxController } from './whatsapp-inbox.controller';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppConnectModule } from '../whatsapp-connect/whatsapp-connect.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderSyncModule } from '../order-sync/order-sync.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [WhatsAppModule, WhatsAppConnectModule, OrdersModule, OrderSyncModule, PlansModule],
  controllers: [WhatsAppInboxController],
  providers: [WhatsAppInboxService],
  exports: [WhatsAppInboxService],
})
export class WhatsAppInboxModule {}
