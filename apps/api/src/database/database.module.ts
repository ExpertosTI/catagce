import { Module, Global } from '@nestjs/common';
import { createClientFromEnv } from '@catagce/db';

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
