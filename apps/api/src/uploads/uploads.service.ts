import { Injectable, BadRequestException } from '@nestjs/common';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif']);

@Injectable()
export class UploadsService {
  saveImage(sellerId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Archivo vacío');
    if (file.size > MAX_BYTES) throw new BadRequestException('Imagen muy grande (máx 10MB)');

    const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
    if (!ALLOWED.has(ext)) throw new BadRequestException('Formato no soportado. Usa JPG, PNG, WEBP o GIF');

    const dir = join(UPLOAD_DIR, sellerId);
    mkdirSync(dir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    writeFileSync(join(dir, filename), file.buffer);

    const base = process.env.PUBLIC_API_URL || 'https://api.catagce.renace.tech/api';
    return {
      url: `${base}/uploads/${sellerId}/${filename}`,
      filename,
    };
  }

  getFilePath(sellerId: string, filename: string): string | null {
    if (!filename || filename.includes('..') || filename.includes('/')) return null;
    const path = join(UPLOAD_DIR, sellerId, filename);
    return existsSync(path) ? path : null;
  }
}
