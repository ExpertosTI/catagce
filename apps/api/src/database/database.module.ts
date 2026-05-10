import { Module, Global } from '@nestjs/common';
import { createClient } from '@catagce/db';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const dbUrl = process.env.DATABASE_URL;
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
