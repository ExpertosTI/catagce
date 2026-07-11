import { Controller, Post, Body, Get, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '../common/security/security.util';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: VerificationService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Get('whatsapp/status')
  @Public()
  @Throttle(30, 60_000)
  async whatsappStatus() {
    const s = await this.whatsapp.status();
    // No filtrar secretos; solo estado de alto nivel
    return {
      whatsapp: s.whatsapp,
      ready: s.ready,
      connected: s.connected,
      state: s.state,
      instance: s.instance ? String(s.instance).slice(0, 48) : null,
    };
  }

  /** Solo admin autenticado — deshabilitado por defecto en prod */
  @Post('whatsapp/test-send')
  @Throttle(3, 60_000)
  async testSend(
    @CurrentUser() user: UserPayload,
    @Body() body: { phone: string; text?: string },
  ) {
    if (process.env.ALLOW_WA_TEST_SEND !== '1') {
      throw new ForbiddenException('test-send deshabilitado');
    }
    if (!body?.phone) throw new BadRequestException('phone requerido');
    const text = String(body.text || 'Prueba Catagce WhatsApp ✓').slice(0, 200);
    const result = await this.whatsapp.sendText(body.phone, text);
    const status = await this.whatsapp.status();
    return { ...result, instance: status.instance, state: status.state, by: user.sellerId };
  }

  @Post('whatsapp/check')
  @Public()
  @Throttle(20, 60_000)
  checkPhone(@Body() body: { phone: string }) {
    return this.authService.checkPhoneForAuth(body.phone);
  }

  @Post('whatsapp/send-code')
  @Public()
  @Throttle(8, 15 * 60_000)
  sendCode(@Body() body: { phone: string; purpose?: 'register' | 'login' }) {
    return this.authService.checkPhoneForAuth(body.phone).then((check) => {
      const purpose = body.purpose || (check.exists ? 'login' : 'register');
      return this.verification.sendCode(body.phone, purpose);
    });
  }

  @Post('whatsapp/verify')
  @Public()
  @Throttle(20, 15 * 60_000)
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
  @Throttle(10, 60_000)
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
  @Throttle(5, 60_000)
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
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    return this.authService.register(body);
  }

  @Post('login')
  @Public()
  @Throttle(15, 60_000)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
