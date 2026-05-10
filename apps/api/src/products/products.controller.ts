import { Controller, Get, Post, Body, UseInterceptors, Param } from '@nestjs/common';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { ProductsService } from './products.service';

@Controller('products')
@UseInterceptors(TenantInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  
  @Get()
  async findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.findAll(user.sellerId);
  }

  @Post()
  async create(@CurrentUser() user: UserPayload, @Body() createProductDto: any) {
    return this.productsService.create(user.sellerId, createProductDto);
  }

  @Post(':id/view')
  async incrementViews(@Param('id') id: string) {
    return this.productsService.incrementViews(id);
  }
}
