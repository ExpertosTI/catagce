import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlansModule } from '../plans/plans.module';
import { SurveyModule } from '../survey/survey.module';

@Module({
  imports: [PlansModule, SurveyModule],
  controllers: [PlatformController],
})
export class PlatformModule {}
