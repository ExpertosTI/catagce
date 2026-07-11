import { Controller, Get, Post, Body, Param, Patch, ForbiddenException, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Throttle } from '../common/security/security.util';
import { RequireFeature } from '../common/decorators/feature.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';

@Controller('orders')
@RequireFeature('orders')
@UseGuards(FeatureGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.ordersService.findAll(user.sellerId);
  }

  /** Solo vendedores autenticados — pedidos públicos van por /public/orders */
  @Post()
  @Throttle(30, 60_000)
  create(@CurrentUser() user: UserPayload, @Body() body: any) {
    if (body?.sellerId && body.sellerId !== user.sellerId) {
      throw new ForbiddenException('sellerId no coincide con la sesión');
    }
    return this.ordersService.create({ ...body, sellerId: user.sellerId });
  }

  @Patch(':id/status')
  @Throttle(60, 60_000)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body('status') status: string,
  ) {
    const allowed = ['submitted', 'reserved', 'confirmed', 'rejected', 'cancelled', 'draft_capture'];
    if (!allowed.includes(String(status))) {
      throw new ForbiddenException('Estado inválido');
    }
    return this.ordersService.updateStatus(id, user.sellerId, status, user.userId);
  }
}
