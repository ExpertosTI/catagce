import {
  Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    return this.uploadsService.saveImage(user.sellerId, file);
  }

  @Public()
  @Get(':sellerId/:filename')
  serveFile(
    @Param('sellerId') sellerId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const path = this.uploadsService.getFilePath(sellerId, filename);
    if (!path) throw new NotFoundException('Imagen no encontrada');
    res.sendFile(path);
  }
}
