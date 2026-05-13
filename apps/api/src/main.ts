import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Logger sencillo para depuración de rutas
  app.use((req: any, res: any, next: () => void) => {
    if (req.method !== 'OPTIONS') {
      Logger.log(`🚀 ${req.method} ${req.url}`, 'Network');
    }
    next();
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Desactivar CSP temporalmente para asegurar carga de assets
  }));
  
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true, // Permitir cualquier origen que coincida con la lógica de cookies
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '42100', 10);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API ready on :${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
