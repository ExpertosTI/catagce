import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { InvoiceReminderService } from './invoice-reminder.service';
import { StockAlertService } from './stock-alert.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, InvoiceReminderService, StockAlertService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
