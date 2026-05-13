import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createPublicOrder(@Body() dto: any) {
    // Aquí recibimos el pedido desde la página pública del catálogo
    // No requiere autenticación ya que es un comprador externo
    return this.ordersService.create(dto.sellerId, dto);
  }
}
