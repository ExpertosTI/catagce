import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('accounts-receivable')
  accountsReceivable(@CurrentUser() user: AuthUser) {
    return this.reportsService.accountsReceivable(user);
  }

  @Get('sales')
  sales(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesSummary(user, from, to);
  }

  @Get('inventory')
  inventory(@CurrentUser() user: AuthUser) {
    return this.reportsService.inventory(user);
  }
}
