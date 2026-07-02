import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('staff/register')
  registerStaff(@Body() body: {
    companyName: string; companySlug: string; email: string; password: string; name: string; phone?: string;
  }) {
    return this.authService.registerStaff(body);
  }

  @Public()
  @Post('staff/login')
  loginStaff(@Body() body: { email: string; password: string }) {
    return this.authService.loginStaff(body.email, body.password);
  }

  @Public()
  @Post('client/register')
  registerClient(@Body() body: {
    companySlug: string; name: string; email: string; password: string;
    phone?: string; taxId?: string; address?: string;
  }) {
    return this.authService.registerClient(body);
  }

  @Public()
  @Post('client/login')
  loginClient(@Body() body: { email: string; password: string; companySlug?: string }) {
    return this.authService.loginClient(body.email, body.password, body.companySlug);
  }

  @Public()
  @Post('client/oauth')
  loginClientOAuth(@Body() body: { idToken: string; companySlug: string; displayName?: string }) {
    return this.authService.loginClientOAuth(body);
  }
}
