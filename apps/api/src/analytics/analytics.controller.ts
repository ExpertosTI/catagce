import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: UserPayload) {
    return this.analyticsService.getDashboard(user.sellerId);
  }
}
