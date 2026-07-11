import { Module } from '@nestjs/common';
import { WhatsAppInboxController } from './whatsapp-inbox.controller';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppConnectModule } from '../whatsapp-connect/whatsapp-connect.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderSyncModule } from '../order-sync/order-sync.module';

@Module({
  imports: [WhatsAppModule, WhatsAppConnectModule, OrdersModule, OrderSyncModule],
  controllers: [WhatsAppInboxController],
  providers: [WhatsAppInboxService],
  exports: [WhatsAppInboxService],
})
export class WhatsAppInboxModule {}
