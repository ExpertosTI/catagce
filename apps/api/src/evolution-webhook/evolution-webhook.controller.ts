import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { EvolutionWebhookService } from './evolution-webhook.service';
import { evolutionAdminKey } from '../whatsapp/evolution-config';

@Controller('webhooks/evolution')
@Public()
export class EvolutionWebhookController {
  constructor(private readonly webhooks: EvolutionWebhookService) {}

  @Post()
  async receive(
    @Body() body: any,
    @Headers('apikey') apikey?: string,
    @Headers('x-evolution-apikey') evoKey?: string,
  ) {
    const expected = evolutionAdminKey();
    const provided = apikey || evoKey || '';
    // Allow if no admin key configured (dev) or matching key
    if (expected && provided && provided !== expected) {
      throw new UnauthorizedException('Invalid Evolution webhook key');
    }
    return this.webhooks.handle(body);
  }
}
