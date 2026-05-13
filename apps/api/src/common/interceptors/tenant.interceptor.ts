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
    
    // El dashboard envía x-seller-id en las cabeceras
    const sellerId = request.headers['x-seller-id'];

    if (!sellerId) {
      // Si no hay sellerId, es una petición anónima o mal configurada
      // Para rutas privadas esto debería fallar
    }

    // Poblamos request.user para que los decoradores @CurrentUser funcionen
    request.user = {
      ...request.user,
      sellerId: sellerId,
    };

    return next.handle();
  }
}
