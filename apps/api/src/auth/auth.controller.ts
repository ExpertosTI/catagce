import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body() body: {
      sellerName: string;
      sellerSlug: string;
      email: string;
      password: string;
      name: string;
      phone?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @Public()
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
