import { Controller, Get, Inject, HttpCode } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from './database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  @Get()
  async check() {
    const checks: Record<string, 'ok' | 'error'> = { app: 'ok', database: 'ok' };
    let migrations: number | null = null;

    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      checks.database = 'error';
    }

    if (checks.database === 'ok') {
      try {
        const rows = await this.db.execute(sql`SELECT COUNT(*)::int AS count FROM __catagce_migrations__`);
        migrations = (rows as any)[0]?.count ?? null;
      } catch {
        migrations = null;
      }
    }

    return {
      status: Object.values(checks).every((v) => v === 'ok') ? 'ok' : 'degraded',
      checks,
      migrations,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      env: process.env.NODE_ENV || 'unknown',
    };
  }

  @Get('ready')
  @HttpCode(200)
  ready() {
    return { ready: true, at: new Date().toISOString() };
  }
}
