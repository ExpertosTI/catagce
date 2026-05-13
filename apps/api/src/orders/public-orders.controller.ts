import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createPublicOrder(@Body() dto: any) {
    return this.ordersService.submitPublicOrder(dto);
  }
}
