import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { COMPROBANTE_LABELS } from './fiscal.util';

@StaffOnly()
@Controller('fiscal')
export class FiscalController {
  constructor(private fiscalService: FiscalService) {}

  @Get('comprobante-types')
  comprobanteTypes() {
    return Object.entries(COMPROBANTE_LABELS).map(([code, label]) => ({ code, label }));
  }

  @Get('sequences')
  listSequences(@CurrentUser() user: AuthUser) {
    return this.fiscalService.listSequences(user);
  }

  @Get('sequences/:type')
  getSequence(@CurrentUser() user: AuthUser, @Param('type') type: any) {
    return this.fiscalService.getSequenceStatus(user, type);
  }

  @Put('sequences')
  upsertSequence(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.fiscalService.upsertSequence(user, body);
  }
}
