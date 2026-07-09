import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: VerificationService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Get('whatsapp/status')
  @Public()
  whatsappStatus() {
    return this.whatsapp.status();
  }

  @Post('whatsapp/check')
  @Public()
  checkPhone(@Body() body: { phone: string }) {
    return this.authService.checkPhoneForAuth(body.phone);
  }

  @Post('whatsapp/send-code')
  @Public()
  sendCode(@Body() body: { phone: string; purpose?: 'register' | 'login' }) {
    return this.authService.checkPhoneForAuth(body.phone).then((check) => {
      const purpose = body.purpose || (check.exists ? 'login' : 'register');
      return this.verification.sendCode(body.phone, purpose);
    });
  }

  @Post('whatsapp/verify')
  @Public()
  async verify(@Body() body: { phone: string; code: string; purpose?: 'register' | 'login' }) {
    const check = await this.authService.checkPhoneForAuth(body.phone);
    const purpose = body.purpose || (check.exists ? 'login' : 'register');
    const result = await this.verification.verifyCode(body.phone, body.code, purpose);
    if (purpose === 'login') {
      const session = await this.authService.loginWithWhatsApp(result.verificationToken);
      return { ...result, ...session, mode: 'login' };
    }
    return { ...result, mode: 'register' };
  }

  @Post('whatsapp/register')
  @Public()
  registerWhatsApp(@Body() body: {
    verificationToken: string;
    sellerName: string;
    sellerSlug: string;
    name: string;
    email?: string;
  }) {
    return this.authService.registerWithWhatsApp(body);
  }

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
