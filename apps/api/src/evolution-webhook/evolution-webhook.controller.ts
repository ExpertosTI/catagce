import {
  Body, Controller, Headers, Post, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { EvolutionWebhookService } from './evolution-webhook.service';
import { evolutionAdminKey } from '../whatsapp/evolution-config';
import { safeEqualString, Throttle } from '../common/security/security.util';

@Controller('webhooks/evolution')
@Public()
export class EvolutionWebhookController {
  constructor(private readonly webhooks: EvolutionWebhookService) {}

  @Post()
  @Throttle(300, 60_000)
  async receive(
    @Body() body: any,
    @Headers('apikey') apikey?: string,
    @Headers('x-evolution-apikey') evoKey?: string,
  ) {
    const expected = process.env.EVOLUTION_WEBHOOK_SECRET?.trim() || evolutionAdminKey();
    if (!expected) {
      throw new ServiceUnavailableException('Webhook Evolution no configurado');
    }
    const provided = apikey || evoKey || '';
    if (!provided || !safeEqualString(provided, expected)) {
      throw new UnauthorizedException('Invalid Evolution webhook key');
    }
    // Limitar tamaño lógico del payload
    const raw = JSON.stringify(body || {});
    if (raw.length > 200_000) {
      throw new UnauthorizedException('Payload demasiado grande');
    }
    return this.webhooks.handle(body);
  }
}
