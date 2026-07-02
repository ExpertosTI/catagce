import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { STAFF_ONLY_KEY, CLIENT_ONLY_KEY } from '../decorators/roles.decorator';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token JWT requerido');
    }

    try {
      const payload = this.jwtService.verify(authHeader.slice(7));
      request.user = await this.authService.validateJwt(payload);
    } catch {
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }

    const staffOnly = this.reflector.getAllAndOverride<boolean>(STAFF_ONLY_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    const clientOnly = this.reflector.getAllAndOverride<boolean>(CLIENT_ONLY_KEY, [
      context.getHandler(), context.getClass(),
    ]);

    if (staffOnly && request.user.type !== 'staff') {
      throw new ForbiddenException('Acceso solo para personal administrativo');
    }
    if (clientOnly && request.user.type !== 'client') {
      throw new ForbiddenException('Acceso solo para clientes');
    }

    return true;
  }
}
