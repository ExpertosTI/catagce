import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  /** Todos los contactos (app + WhatsApp) para compartir/enviar */
  @Get()
  list(@CurrentUser() user: UserPayload) {
    return this.contacts.listForSeller(user.sellerId);
  }

  /** Solo contactos guardados en la app (CRUD) */
  @Get('managed')
  managed(@CurrentUser() user: UserPayload) {
    return this.contacts.listManaged(user.sellerId);
  }

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() body: { name: string; phone: string; email?: string },
  ) {
    return this.contacts.create(user.sellerId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.contacts.delete(user.sellerId, id);
  }
}
