import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { InvoicesService, DispatchesService } from './invoices.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private dispatchesService: DispatchesService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.invoicesService.list(user);
  }

  @Get('dispatches/history')
  dispatchHistory(@CurrentUser() user: AuthUser) {
    return this.dispatchesService.listAll(user);
  }

  @Get('pending-dispatch')
  pendingDispatch(@CurrentUser() user: AuthUser) {
    return this.dispatchesService.listPending(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.invoicesService.create(user, body);
  }

  @Post(':id/payments')
  addPayment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.invoicesService.addPayment(user, id, body);
  }

  @Post('dispatches')
  createDispatch(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.dispatchesService.create(user, body);
  }
}
