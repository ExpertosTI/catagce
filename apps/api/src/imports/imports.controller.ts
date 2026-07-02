import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('imports')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.importsService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.importsService.create(user, body);
  }

  @Patch(':id/receive')
  receive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.importsService.receive(user, id);
  }
}
