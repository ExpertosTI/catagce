import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 5 intentos por minuto por IP — previene brute-force */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() body: { slug?: string; email?: string; password?: string }) {
    if (body.email && body.password) {
      return this.authService.loginWithEmail(body.email, body.password);
    }
    if (body.slug) {
      return this.authService.loginWithSlug(body.slug.trim());
    }
    throw new BadRequestException('Credentials are required');
  }
}
