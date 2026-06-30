import { Module, Global } from '@nestjs/common';
import { createClient } from '@catagce/db';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        let dbUrl = process.env.DATABASE_URL;
        if (process.env.DB_HOST) {
          const user = process.env.DB_USER || 'catagce_admin';
          const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
          const host = process.env.DB_HOST;
          const port = process.env.DB_PORT || '5432';
          const name = process.env.DB_NAME || 'catagce_prod';
          dbUrl = `postgres://${user}:${pass}@${host}:${port}/${name}`;
        }
        if (!dbUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        return createClient(dbUrl);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
