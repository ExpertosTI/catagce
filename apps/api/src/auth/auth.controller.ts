import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 5 intentos por minuto por IP — previene brute-force */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body('slug') slug: string) {
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new BadRequestException('slug is required');
    }
    return this.authService.loginWithSlug(slug.trim());
  }
}
