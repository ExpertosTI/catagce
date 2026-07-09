import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { CommerceNotifyService } from './commerce-notify.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, CommerceNotifyService],
  exports: [WhatsAppService, CommerceNotifyService],
})
export class WhatsAppModule {}
