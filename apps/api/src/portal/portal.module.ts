import { Module } from '@nestjs/common';
import { PortalController, DashboardController } from './portal.controller';
import { PortalService, DashboardService } from './portal.service';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CatalogsModule, NotificationsModule, AiModule],
  controllers: [PortalController, DashboardController],
  providers: [PortalService, DashboardService],
})
export class PortalModule {}
