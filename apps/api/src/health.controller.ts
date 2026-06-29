import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      estado: 'ok',
      marca_de_tiempo: new Date().toISOString(),
      tiempo_activo: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }
}
