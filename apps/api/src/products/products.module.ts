import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'media' })],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
