import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'media' })],
  controllers: [ProductsController],
  providers: [ProductsService, WebhookDispatcherService, AuditService],
  exports: [ProductsService],
})
export class ProductsModule {}
