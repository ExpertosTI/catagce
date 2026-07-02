import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { InvoiceReminderService } from './invoice-reminder.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, InvoiceReminderService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
