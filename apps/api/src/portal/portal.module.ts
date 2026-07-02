import { Module } from '@nestjs/common';
import { PortalController, DashboardController } from './portal.controller';
import { PortalService, DashboardService } from './portal.service';
import { CatalogsModule } from '../catalogs/catalogs.module';

@Module({
  imports: [CatalogsModule],
  controllers: [PortalController, DashboardController],
  providers: [PortalService, DashboardService],
})
export class PortalModule {}
