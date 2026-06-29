import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.ordersService.findAll(user.sellerId);
  }

  @Post()
  @Public()
  create(@Body() body: any) {
    return this.ordersService.create(body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, user.sellerId, status, user.userId);
  }
}
