import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformWhatsAppService } from './platform-whatsapp.service';
import { PlansModule } from '../plans/plans.module';
import { SurveyModule } from '../survey/survey.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';

@Module({
  imports: [PlansModule, SurveyModule, WhatsAppModule],
  controllers: [PlatformController],
  providers: [PlatformAdminService, PlatformWhatsAppService, PlatformAdminGuard],
})
export class PlatformModule {}
