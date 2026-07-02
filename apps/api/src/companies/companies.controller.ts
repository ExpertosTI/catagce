import { Controller, Get, Patch, Body } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.companiesService.getMine(user);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.companiesService.update(user, body);
  }
}
