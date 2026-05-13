import { Global, Module, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { createClient, CatagceDb } from '@catagce/db';
import { runEmbeddedMigrations } from './migrations';

export const DRIZZLE = 'DRIZZLE';
export type Database = CatagceDb;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): CatagceDb => {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        const max = parseInt(process.env.DB_POOL_MAX || '20', 10);
        const idle = parseInt(process.env.DB_POOL_IDLE || '30', 10);
        const connect = parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '10', 10);
        return createClient(dbUrl, {
          max,
          idleTimeout: idle,
          connectTimeout: connect,
          disablePreparedStatements: process.env.DB_PGBOUNCER === '1',
        });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async onModuleInit() {
    if (process.env.SKIP_MIGRATIONS === '1') {
      this.logger.warn('SKIP_MIGRATIONS=1 — skipping embedded migrations.');
      return;
    }
    this.logger.log('Running embedded migrations...');
    try {
      await runEmbeddedMigrations(this.db, this.logger);
      this.logger.log('Database schema is up to date.');
    } catch (err: any) {
      this.logger.error(`Migrations failed: ${err.message}`);
      if (process.env.MIGRATIONS_STRICT === '1') {
        throw err;
      }
    }
  }
}
