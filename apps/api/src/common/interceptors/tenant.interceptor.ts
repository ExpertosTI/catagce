import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sellerId) {
      // Allow health and public catalog endpoints to pass without seller context
      const isPublic = request.url.includes('/health') || request.url.includes('/public');
      if (!isPublic) {
        throw new UnauthorizedException('Missing seller context');
      }
    }

    return next.handle();
  }
}
