import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: IORedis | null = null;

  getClient(): IORedis {
    if (!this.client) {
      this.client = new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
    }
    return this.client;
  }

  async incrWithTtl(key: string, windowMs: number): Promise<number> {
    const redis = this.getClient();
    if (redis.status !== 'ready') await redis.connect();
    const n = await redis.incr(key);
    if (n === 1) await redis.pexpire(key, windowMs);
    return n;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => null);
      this.client = null;
    }
  }
}
