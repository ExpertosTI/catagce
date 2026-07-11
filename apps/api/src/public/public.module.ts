import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { OrdersModule } from '../orders/orders.module';
import { OrderSyncModule } from '../order-sync/order-sync.module';

@Module({
  imports: [OrdersModule, OrderSyncModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
