import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.findAll(user.sellerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.sellerId, dto);
  }

  /** Public — buyers viewing a catalog can increment the product view counter. */
  @Post(':id/view')
  incrementViews(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.incrementViews(id);
  }
}
