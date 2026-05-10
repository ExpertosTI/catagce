import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { SubmitPublicOrderDto } from './dto/submit-public-order.dto';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Seller: view own orders
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: UserPayload) {
    return this.ordersService.findAll(user.sellerId);
  }

  // Seller: confirm / reject / update status
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, user.sellerId, status);
  }
}

// Public buyer endpoint — separate controller prefix so it cannot be confused
// with seller-authenticated order management
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Zero-login order submission from buyer.
   * Rate-limited to 20 req/min per IP to prevent flooding.
   * unitPrice is resolved server-side from catalog snapshot — never trusted from client.
   */
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post()
  submit(@Body() body: SubmitPublicOrderDto) {
    return this.ordersService.submitPublicOrder(body);
  }
}
