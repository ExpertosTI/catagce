import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { PlansService } from '../../plans/plans.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private plans: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const email = request.user?.email as string | undefined;
    if (email && (await this.plans.isPlatformAdmin(email))) return true;

    const sellerId = request.user?.sellerId;
    if (!sellerId) throw new ForbiddenException('Seller requerido');

    const ok = await this.plans.hasFeature(sellerId, featureKey);
    if (!ok) {
      throw new ForbiddenException(`Tu plan no incluye la función: ${featureKey}`);
    }
    return true;
  }
}
