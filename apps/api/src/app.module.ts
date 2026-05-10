import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { OrdersModule } from './orders/orders.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DatabaseModule, 
    ProductsModule, 
    CatalogsModule, 
    OrdersModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
