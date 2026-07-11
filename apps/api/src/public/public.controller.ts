import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '../common/security/security.util';

@Controller('public')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('catalog/:token')
  @Throttle(60, 60_000)
  async getCatalog(
    @Param('token') token: string,
    @Query('p') prefillToken?: string,
  ) {
    if (!token || token.length > 128) throw new BadRequestException('Token inválido');
    return this.publicService.getCatalogByToken(token, prefillToken);
  }

  @Post('orders')
  @Throttle(12, 60_000)
  async createOrder(
    @Body()
    body: {
      token: string;
      buyerName: string;
      buyerPhone: string;
      items: Array<{ productId: string; quantity: number }>;
      notes?: string;
      source?: string;
    },
  ) {
    return this.publicService.createOrder(body);
  }

  @Get('orders/:id')
  @Throttle(30, 60_000)
  async getOrder(@Param('id') id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('ID inválido');
    return this.publicService.getOrderPublic(id);
  }
}
