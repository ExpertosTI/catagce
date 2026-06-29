import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('public')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('catalog/:token')
  async getCatalog(@Param('token') token: string) {
    return this.publicService.getCatalogByToken(token);
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
    },
  ) {
    return this.publicService.createOrder(body);
  }
}
