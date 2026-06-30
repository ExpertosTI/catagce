import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from './common/decorators/public.decorator';
import { DRIZZLE } from './database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  @Get()
  @Public()
  async check() {
    let dbOk = false;
    try {
      await this.db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (err) {
      console.error('Health DB check failed:', err);
    }

    if (!dbOk) {
      throw new ServiceUnavailableException({
        estado: 'degradado',
        db: 'error',
        marca_de_tiempo: new Date().toISOString(),
      });
    }

    return {
      estado: 'ok',
      db: 'ok',
      marca_de_tiempo: new Date().toISOString(),
      tiempo_activo: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }
}
