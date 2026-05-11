import { Controller, Get, Post, Body, UseGuards, Patch } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserPayload) {
    return this.sellersService.getProfile(user.sellerId);
  }

  @Patch('branding')
  @UseGuards(JwtAuthGuard)
  updateBranding(@CurrentUser() user: UserPayload, @Body() body: any) {
    return this.sellersService.updateBranding(user.sellerId, body);
  }
}
