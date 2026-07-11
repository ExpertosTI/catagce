import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { SurveyService } from '../survey/survey.service';
import { RequirePlatformAdmin } from '../common/decorators/feature.decorator';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';

@Controller('platform')
@RequirePlatformAdmin()
@UseGuards(PlatformAdminGuard)
export class PlatformController {
  constructor(
    private readonly plans: PlansService,
    private readonly survey: SurveyService,
  ) {}

  @Get('sellers')
  listSellers() {
    return this.plans.listSellersWithPlans();
  }

  @Patch('sellers/:id/plan')
  assignPlan(@Param('id') id: string, @Body() body: { planCode: string }) {
    return this.plans.assignSellerPlan(id, body.planCode);
  }

  @Get('admins')
  listAdmins() {
    return this.plans.listPlatformAdmins();
  }

  @Post('admins')
  addAdmin(@Body() body: { email: string; name?: string }) {
    return this.plans.addPlatformAdmin(body.email, body.name);
  }

  @Get('survey')
  surveyAdmin() {
    return this.survey.getAdminState();
  }

  @Patch('survey')
  patchSurvey(@Body() body: { isOpen?: boolean; endsAt?: string; extendDays?: number }) {
    return this.survey.updateMeta(body);
  }
}
