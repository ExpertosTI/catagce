import {
  Controller, Get, Headers, Post, Query, Req, UnauthorizedException,
  ServiceUnavailableException, Body, Res,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '../common/security/security.util';
import { verifyMetaSignature } from '../common/security/crypto.util';
import { MetaWebhookService } from './meta-webhook.service';

@Controller('webhooks/meta')
@Public()
export class MetaWebhookController {
  constructor(private readonly webhooks: MetaWebhookService) {}

  /** Verificación Meta (hub.challenge) — respuesta texto plano */
  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: { status: (c: number) => { type: (t: string) => { send: (b: string) => unknown } } },
  ) {
    const expected = String(process.env.META_WA_VERIFY_TOKEN || '').trim();
    if (!expected) {
      throw new ServiceUnavailableException('META_WA_VERIFY_TOKEN no configurado');
    }
    if (mode === 'subscribe' && token === expected && challenge) {
      return res.status(200).type('text/plain').send(challenge);
    }
    throw new UnauthorizedException('Verify token inválido');
  }

  @Post()
  @Throttle(600, 60_000)
  async receive(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers('x-hub-signature-256') signature?: string,
    @Body() body?: unknown,
  ) {
    const appSecret = String(process.env.META_WA_APP_SECRET || '').trim();
    if (!appSecret) {
      throw new ServiceUnavailableException('META_WA_APP_SECRET no configurado');
    }
    const raw = req.rawBody || Buffer.from(JSON.stringify(body || {}));
    if (!verifyMetaSignature(raw, signature, appSecret)) {
      throw new UnauthorizedException('Firma Meta inválida');
    }
    if (raw.length > 500_000) {
      throw new UnauthorizedException('Payload demasiado grande');
    }
    const parsed = body && typeof body === 'object'
      ? body
      : JSON.parse(raw.toString('utf8'));
    return this.webhooks.handle(parsed);
  }
}
