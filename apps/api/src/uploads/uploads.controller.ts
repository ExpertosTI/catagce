import {
  Controller, Post, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { StaffOnly } from '../common/decorators/roles.decorator';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'images');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('uploads')
export class UploadsController {
  @StaffOnly()
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir();
        cb(null, UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${extname(file.originalname) || '.jpg'}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024 },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Imagen requerida');
    return { url: `/api/files/images/${file.filename}` };
  }
}
