import { Controller, Get, Post, Body, Param, Patch, UseInterceptors } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseInterceptors(TenantInterceptor)
  async findAll(@CurrentUser() user: UserPayload) {
    return this.ordersService.findAll(user.sellerId);
  }

  @Post()
  async create(@Body() createOrderDto: any) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  @UseInterceptors(TenantInterceptor)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}
