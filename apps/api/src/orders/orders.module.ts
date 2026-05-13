import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { PublicOrdersController } from './public-orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
