import {
  Controller, Get, Post, Patch, Delete, Body, Param,
} from '@nestjs/common';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.findAll(user.sellerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.productsService.findOne(id, user.sellerId);
  }

  @Post()
  create(@CurrentUser() user: UserPayload, @Body() body: any) {
    return this.productsService.create(user.sellerId, body, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: UserPayload, @Body() body: any) {
    return this.productsService.update(id, user.sellerId, body, user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.productsService.delete(id, user.sellerId, user.userId);
  }

  @Post(':id/variants')
  addVariant(@Param('id') id: string, @CurrentUser() user: UserPayload, @Body() body: any) {
    return this.productsService.addVariant(id, user.sellerId, body);
  }

  @Post(':id/barcodes')
  addBarcode(@Param('id') id: string, @CurrentUser() user: UserPayload, @Body() body: any) {
    return this.productsService.addBarcode(id, user.sellerId, body);
  }

  @Post(':id/view')
  @Public()
  incrementViews(@Param('id') id: string) {
    return this.productsService.incrementViews(id);
  }
}
