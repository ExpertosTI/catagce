import { Controller, Get, Post, Body } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.suppliersService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.suppliersService.create(user, body);
  }
}
