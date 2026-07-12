import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'crypto';
import { RedisService } from '../redis/redis.service';

export const THROTTLE_KEY = 'throttle';
export const Throttle = (limit: number, windowMs: number) =>
  SetMetadata(THROTTLE_KEY, { limit, windowMs });

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of memoryBuckets) {
    if (b.resetAt <= now) memoryBuckets.delete(k);
  }
}, 60_000).unref?.();

function clientKey(req: any): string {
  const xf = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = xf || req.ip || req.socket?.remoteAddress || 'unknown';
  const user = req.user?.sellerId || req.user?.userId || '';
  return `${ip}:${user}`;
}

function memoryIncr(key: string, windowMs: number): number {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count;
}

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ limit: number; windowMs: number } | undefined>(
      THROTTLE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const limit = meta?.limit ?? 120;
    const windowMs = meta?.windowMs ?? 60_000;
    const req = ctx.switchToHttp().getRequest();
    const route = `${req.method}:${req.route?.path || req.url?.split('?')[0] || ''}`;
    const key = `throttle:${clientKey(req)}:${route}:${limit}:${windowMs}`;

    let count = 0;
    try {
      count = await this.redis.incrWithTtl(key, windowMs);
    } catch {
      count = memoryIncr(key, windowMs);
    }

    if (count > limit) {
      throw new HttpException(
        { message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.', statusCode: 429 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

export function safeEqualString(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Bloquea SSRF obvio a redes privadas / metadata */
export function assertSafeOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpException('URL inválida', HttpStatus.BAD_REQUEST);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new HttpException('Solo se permiten URLs http(s)', HttpStatus.BAD_REQUEST);
  }
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost'
    || host === 'metadata.google.internal'
    || host.endsWith('.local')
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || host === '::1'
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    || /^169\.254\./.test(host)
  ) {
    throw new HttpException('URL de destino no permitida', HttpStatus.BAD_REQUEST);
  }
  return url;
}

export function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

export function requireJwtSecret(): string {
  const secret = String(process.env.JWT_SECRET || '').trim();
  const isProd = process.env.NODE_ENV === 'production' || process.env.CATAGCE_ENV === 'production';
  if (isProd) {
    if (!secret || secret.length < 32 || secret.includes('change-in-production') || secret === 'catagce-dev-secret-change-in-production') {
      throw new Error('JWT_SECRET seguro (>=32 chars) es obligatorio en producción');
    }
  }
  return secret || 'catagce-dev-secret-change-in-production';
}
