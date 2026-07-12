import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { eq, or } from 'drizzle-orm';
import { sellerApiKeys, sellers } from '@catagce/db';
import { DRIZZLE } from '../../database/database.module';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../../auth/auth.service';
import { hashApiKey } from '../security/crypto.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private reflector: Reflector,
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'] as string;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.verify(authHeader.slice(7));
        request.user = await this.authService.validateJwt(payload);
        return true;
      } catch {
        throw new UnauthorizedException('Token JWT inválido o expirado');
      }
    }

    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new UnauthorizedException('Autenticación requerida (JWT Bearer o x-api-key)');
    }

    const hashed = hashApiKey(apiKey);
    const [keyRecord] = await this.db
      .select()
      .from(sellerApiKeys)
      .where(or(eq(sellerApiKeys.keyHash, hashed), eq(sellerApiKeys.key, apiKey)))
      .limit(1);

    if (!keyRecord) throw new UnauthorizedException('API key inválida');

    // Migración lazy: plaintext → hash
    if (keyRecord.key && !keyRecord.keyHash) {
      await this.db.update(sellerApiKeys).set({
        keyHash: hashed,
        keyPrefix: apiKey.length <= 12 ? apiKey : `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`,
        key: null,
      }).where(eq(sellerApiKeys.id, keyRecord.id));
    }

    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.id, keyRecord.sellerId))
      .limit(1);

    await this.db.update(sellerApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(sellerApiKeys.id, keyRecord.id));

    request.user = {
      userId: keyRecord.id,
      sellerId: keyRecord.sellerId,
      email: seller?.email || '',
      role: 'api_key',
      sellerName: seller?.name || '',
    };

    return true;
  }
}
