import { Module } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyPublicController } from './survey.public.controller';

@Module({
  controllers: [SurveyPublicController],
  providers: [SurveyService],
  exports: [SurveyService],
})
export class SurveyModule {}
