import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [
    InventoryModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, WebhookDispatcherService, AuditService],
  exports: [OrdersService],
})
export class OrdersModule {}
