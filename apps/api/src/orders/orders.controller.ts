import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { SubmitPublicOrderDto } from './dto/submit-public-order.dto';
import { UpdateOrderStatusDto } from './dto/update-status.dto';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.ordersService.findAll(user.sellerId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: UserPayload, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.ordersService.findOne(user.sellerId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.sellerId, dto.status);
  }
}

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post()
  submit(@Body() body: SubmitPublicOrderDto) {
    return this.ordersService.submitPublicOrder(body);
  }
}
