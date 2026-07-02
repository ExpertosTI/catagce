import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @StaffOnly()
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.productsService.list(user);
  }

  @StaffOnly()
  @Get('categories')
  categories(@CurrentUser() user: AuthUser) {
    return this.productsService.listCategories(user);
  }

  @StaffOnly()
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.getById(user, id);
  }

  @StaffOnly()
  @Post('ai-describe')
  aiDescribe(@CurrentUser() user: AuthUser, @Body() body: { name: string; category?: string }) {
    return this.productsService.generateDescription(user, body.name, body.category);
  }

  @StaffOnly()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.productsService.create(user, body);
  }

  @StaffOnly()
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.productsService.update(user, id, body);
  }

  @StaffOnly()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.remove(user, id);
  }

  @StaffOnly()
  @Post(':id/stock-adjustment')
  adjustStock(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.productsService.adjustStock(user, id, body);
  }

  @StaffOnly()
  @Get(':id/stock-movements')
  stockMovements(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.listStockMovements(user, id);
  }
}
