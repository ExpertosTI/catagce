import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_KEY } from '../decorators/feature.decorator';
import { PlansService } from '../../plans/plans.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private plans: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const email = request.user?.email as string | undefined;
    if (!email) throw new ForbiddenException('Admin de plataforma requerido');

    const isAdmin = await this.plans.isPlatformAdmin(email);
    if (!isAdmin) throw new ForbiddenException('Admin de plataforma requerido');
    return true;
  }
}
