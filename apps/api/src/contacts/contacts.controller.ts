import { Controller, Get } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@CurrentUser() user: UserPayload) {
    return this.contacts.listForSeller(user.sellerId);
  }
}
