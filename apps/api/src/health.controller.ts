import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      estado: 'ok',
      marca_de_tiempo: new Date().toISOString(),
      tiempo_activo: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }
}
