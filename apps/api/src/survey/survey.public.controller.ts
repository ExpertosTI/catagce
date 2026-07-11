import { Body, Controller, Get, Post, Headers } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '../common/security/security.util';

@Controller('public/survey')
@Public()
export class SurveyPublicController {
  constructor(private readonly survey: SurveyService) {}

  @Get()
  @Throttle(60, 60_000)
  getSurvey() {
    return this.survey.getPublicSurvey();
  }

  @Get('stats')
  @Throttle(60, 60_000)
  stats() {
    return this.survey.getStats();
  }

  @Post('vote')
  @Throttle(10, 60_000)
  vote(
    @Body() body: { voterKey?: string; rank1: string; rank2: string; rank3: string },
    @Headers('x-forwarded-for') fwd?: string,
    @Headers('user-agent') ua?: string,
  ) {
    const voterKey = body.voterKey || `${fwd || 'ip'}|${ua || 'ua'}`;
    return this.survey.vote({ ...body, voterKey });
  }

  @Post('suggest')
  @Throttle(10, 60_000)
  suggest(
    @Body() body: { voterKey?: string; suggestion: string },
    @Headers('x-forwarded-for') fwd?: string,
    @Headers('user-agent') ua?: string,
  ) {
    const voterKey = body.voterKey || `${fwd || 'ip'}|${ua || 'ua'}`;
    return this.survey.suggest({ voterKey, suggestion: body.suggestion });
  }
}
