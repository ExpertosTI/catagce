import { Module, Global } from '@nestjs/common';
import { createClientFromEnv } from '@ghome/db';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => createClientFromEnv(),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
