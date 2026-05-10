import { Module } from '@nestjs/common';
import { OrdersController, PublicOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseModule } from '../database/database.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
