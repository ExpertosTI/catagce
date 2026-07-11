import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { FeatureGuard } from '../common/guards/feature.guard';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';

@Module({
  controllers: [PlansController],
  providers: [PlansService, FeatureGuard, PlatformAdminGuard],
  exports: [PlansService, FeatureGuard, PlatformAdminGuard],
})
export class PlansModule {}
