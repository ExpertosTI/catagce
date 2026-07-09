import { Module } from '@nestjs/common';
import { WhatsAppInboxController } from './whatsapp-inbox.controller';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [WhatsAppInboxController],
  providers: [WhatsAppInboxService],
})
export class WhatsAppInboxModule {}
