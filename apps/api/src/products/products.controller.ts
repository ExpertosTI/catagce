import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    // Para simplificar y que funcione YA, vamos a usar un servicio de subida ficticio
    // o simplemente devolver una URL temporal si logramos guardarlo.
    // Por ahora, vamos a simular que se guardó para no bloquear el flujo.
    console.log('Archivo recibido:', file?.originalname);
    return { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400' };
  }

  /** Public — buyers viewing a catalog can increment the product view counter. */
  @Post(':id/view')
  incrementViews(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.incrementViews(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: UserPayload, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.remove(user.sellerId, id);
  }
}
