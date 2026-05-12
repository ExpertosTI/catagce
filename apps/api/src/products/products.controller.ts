import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // In a real scenario, we would save the file and return the URL
    // For now, we'll simulate it or return a placeholder
    return {
      url: `https://catagce.renace.tech/uploads/${file.filename}`
    };
  }

  @Post(':id/view')
  incrementViews(@Param('id') id: string) {
    return this.productsService.incrementViews(id);
  }
}
