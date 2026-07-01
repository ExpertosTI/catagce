import {
  Controller, Post, Get, Param, UseInterceptors, UploadedFile,
  NotFoundException, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createReadStream } from 'fs';
import { extname } from 'path';
import { UploadsService } from './uploads.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.avif': 'image/avif',
};

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
  ) {
    const filePath = this.uploadsService.getFilePath(sellerId, filename);
    if (!filePath) throw new NotFoundException('Imagen no encontrada');
    const ext = extname(filename).toLowerCase();
    return new StreamableFile(createReadStream(filePath), {
      type: MIME[ext] || 'application/octet-stream',
    });
  }
}
