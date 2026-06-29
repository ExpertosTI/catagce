import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  await app.listen(3000, '0.0.0.0');
  console.log('Catagce API listening on :3000');
}

bootstrap().catch((err) => {
  console.error('API bootstrap failed:', err);
  process.exit(1);
});
