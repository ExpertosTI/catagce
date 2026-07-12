import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { MetaCloudWhatsAppService } from './meta-cloud-whatsapp.service';

@Module({
  providers: [WhatsAppService, MetaCloudWhatsAppService],
  exports: [WhatsAppService, MetaCloudWhatsAppService],
})
export class WhatsAppModule {}
