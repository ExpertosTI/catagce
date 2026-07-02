import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.productsService.create(user, body);
  }
}
