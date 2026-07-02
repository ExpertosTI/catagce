import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

const DEFAULT_CORS = [
  'https://generalhome.tech',
  'https://www.generalhome.tech',
  'https://admin.generalhome.tech',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/api/files/' });

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : DEFAULT_CORS;

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(3000, '0.0.0.0');
  console.log('GHome API listening on :3000');
  console.log(`CORS: ${corsOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  console.error('API bootstrap failed:', err);
  process.exit(1);
});
