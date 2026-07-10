import { Module } from '@nestjs/common';
import { WhatsAppConnectController } from './whatsapp-connect.controller';
import { WhatsAppConnectService } from './whatsapp-connect.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [WhatsAppConnectController],
  providers: [WhatsAppConnectService],
  exports: [WhatsAppConnectService],
})
export class WhatsAppConnectModule {}
