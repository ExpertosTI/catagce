import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ImportsModule } from './imports/imports.module';
import { PortalModule } from './portal/portal.module';
import { PublicModule } from './public/public.module';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProductsModule,
    CatalogsModule,
    ClientsModule,
    InvoicesModule,
    ImportsModule,
    PortalModule,
    PublicModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
