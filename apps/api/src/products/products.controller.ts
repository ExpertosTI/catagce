import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.findAll(user.sellerId);
  }

  @Post()
  create(@CurrentUser() user: UserPayload, @Body() createProductDto: any) {
    return this.productsService.create(user.sellerId, createProductDto);
  }

  @Post(':id/view')
  incrementViews(@Param('id') id: string) {
    return this.productsService.incrementViews(id);
  }
}
