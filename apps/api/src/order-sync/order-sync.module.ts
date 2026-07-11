import { Module } from '@nestjs/common';
import { OrderWhatsAppSyncService } from '../common/services/order-whatsapp-sync.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppConnectModule } from '../whatsapp-connect/whatsapp-connect.module';

@Module({
  imports: [WhatsAppModule, WhatsAppConnectModule],
  providers: [OrderWhatsAppSyncService],
  exports: [OrderWhatsAppSyncService],
})
export class OrderSyncModule {}
