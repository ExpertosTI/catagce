import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('public')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('catalog/:token')
  async getCatalog(
    @Param('token') token: string,
    @Query('p') prefillToken?: string,
  ) {
    return this.publicService.getCatalogByToken(token, prefillToken);
  }

  @Post('orders')
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
  async getOrder(@Param('id') id: string) {
    return this.publicService.getOrderPublic(id);
  }
}
