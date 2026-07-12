import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { SurveyService } from '../survey/survey.service';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformWhatsAppService } from './platform-whatsapp.service';
import { RequirePlatformAdmin } from '../common/decorators/feature.decorator';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly plans: PlansService,
    private readonly survey: SurveyService,
    private readonly admin: PlatformAdminService,
    private readonly platformWa: PlatformWhatsAppService,
  ) {}

  /** Seller autenticado: pedir upgrade / reportar pago */
  @Post('plan-requests')
  createPlanRequest(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      toPlan: string;
      paymentNote?: string;
      paymentMethod?: string;
      amountClaimed?: string;
    },
  ) {
    return this.admin.createUpgradeRequest(user.sellerId, body);
  }

  @Get('plan-requests/mine')
  myPlanRequests(@CurrentUser() user: UserPayload) {
    return this.admin.myRequests(user.sellerId);
  }

  @Get('sellers')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  listSellers() {
    return this.admin.listSellersDetailed();
  }

  @Patch('sellers/:id/plan')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  assignPlan(@Param('id') id: string, @Body() body: { planCode: string }) {
    return this.plans.assignSellerPlan(id, body.planCode);
  }

  @Post('sellers/:id/reset-password')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  resetPassword(
    @Param('id') id: string,
    @Body() body: { password?: string; notifyWhatsApp?: boolean },
  ) {
    return this.admin.resetSellerPassword(id, body);
  }

  @Get('plan-requests/pending-count')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  pendingCount() {
    return this.admin.pendingCount();
  }

  @Get('plan-requests')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  listPlanRequests(@Query('status') status?: string) {
    return this.admin.listRequests(status || undefined);
  }

  @Patch('plan-requests/:id')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  reviewRequest(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; adminNote?: string },
  ) {
    return this.admin.reviewRequest(id, user.email, body);
  }

  @Get('admins')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  listAdmins() {
    return this.plans.listPlatformAdmins();
  }

  @Post('admins')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  addAdmin(@Body() body: { email: string; name?: string }) {
    return this.plans.addPlatformAdmin(body.email, body.name);
  }

  @Get('survey')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  surveyAdmin() {
    return this.survey.getAdminState();
  }

  @Patch('survey')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  patchSurvey(@Body() body: { isOpen?: boolean; endsAt?: string; extendDays?: number }) {
    return this.survey.updateMeta(body);
  }

  @Get('whatsapp')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappStatus() {
    return this.platformWa.status();
  }

  @Post('whatsapp/cloud')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappCloud(
    @Body()
    body: {
      accessToken?: string;
      phoneNumberId: string;
      wabaId?: string;
      otpTemplate?: string;
      otpLang?: string;
      notifyTemplate?: string;
      notifyChannel?: string;
    },
  ) {
    return this.platformWa.saveCloud(body);
  }

  @Post('whatsapp/cloud/test-otp')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappCloudTest(@Body() body: { phone: string }) {
    return this.platformWa.testCloudOtp(body.phone);
  }

  @Post('whatsapp/link')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappLink(@Body() body: { instance: string; displayName?: string }) {
    return this.platformWa.link(body.instance, body.displayName);
  }

  @Post('whatsapp/qr')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappQr() {
    return this.platformWa.startQr();
  }

  @Post('whatsapp/display-name')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappDisplayName(@Body() body: { name: string }) {
    return this.platformWa.setDisplayName(body.name);
  }

  @Post('whatsapp/unlink')
  @RequirePlatformAdmin()
  @UseGuards(PlatformAdminGuard)
  whatsappUnlink() {
    return this.platformWa.unlink();
  }
}
