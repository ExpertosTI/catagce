import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddProductToCatalogDto, CreateCatalogDto } from './dto/catalogs.dto';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: UserPayload) {
    return this.catalogsService.findAll(user.sellerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateCatalogDto) {
    return this.catalogsService.create(user.sellerId, dto);
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard)
  addProduct(
    @CurrentUser() user: UserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddProductToCatalogDto,
  ) {
    return this.catalogsService.addProduct(user.sellerId, id, dto.productId);
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard)
  removeProduct(
    @CurrentUser() user: UserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.catalogsService.removeProduct(user.sellerId, id, productId);
  }

  @Post(':id/render')
  @UseGuards(JwtAuthGuard)
  enqueueRender(
    @CurrentUser() user: UserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.catalogsService.enqueuePdfRender(user.sellerId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: UserPayload, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogsService.remove(user.sellerId, id);
  }

  /** Public buyer endpoint — resolved via slug only, never authenticated. */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.catalogsService.findBySlug(slug);
  }
}
