import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.clientsService.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.clientsService.create(user, body);
  }

  @Patch(':id/status')
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.clientsService.updateStatus(user, id, body.status as any);
  }
}
