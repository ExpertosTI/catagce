import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { RequirePlatformAdmin } from '../common/decorators/feature.decorator';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list() {
    return this.plans.listPlans();
  }

  @Get('me')
  entitlements(@CurrentUser() user: UserPayload) {
    return this.plans.getEntitlements(user.sellerId);
  }

  @Patch(':code/features/:featureKey')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  updateFeature(
    @Param('code') code: string,
    @Param('featureKey') featureKey: string,
    @Body() body: { enabled?: boolean; limitValue?: number | null },
  ) {
    return this.plans.updateFeature(code, featureKey, body);
  }
}
