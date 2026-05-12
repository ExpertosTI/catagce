import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 5 intentos por minuto por IP — previene brute-force */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() loginDto: any) {
    if (loginDto.email && loginDto.password) {
      return this.authService.loginWithEmail(loginDto.email, loginDto.password);
    }
    if (loginDto.slug) {
      return this.authService.loginWithSlug(loginDto.slug.trim());
    }
    throw new BadRequestException('Credentials are required');
  }
}
