import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: UserPayload) {
    return this.sellersService.getProfile(user.sellerId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() body: { name?: string; email?: string; phone?: string },
  ) {
    return this.sellersService.updateProfile(user.sellerId, body);
  }

  @Get('branding')
  async getBranding(@CurrentUser() user: UserPayload) {
    return this.sellersService.getBranding(user.sellerId);
  }

  @Patch('branding')
  async updateBranding(
    @CurrentUser() user: UserPayload,
    @Body() body: {
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      customDomain?: string;
      welcomeMessage?: string;
    },
  ) {
    return this.sellersService.updateBranding(user.sellerId, body);
  }

  @Get('api-keys')
  async listApiKeys(@CurrentUser() user: UserPayload) {
    return this.sellersService.listApiKeys(user.sellerId);
  }

  @Get('onboarding')
  async getOnboarding(@CurrentUser() user: UserPayload) {
    return this.sellersService.getOnboarding(user.sellerId);
  }

  @Patch('onboarding')
  async updateOnboarding(
    @CurrentUser() user: UserPayload,
    @Body() body: { step?: number; completed?: boolean },
  ) {
    return this.sellersService.updateOnboarding(user.sellerId, body);
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: UserPayload) {
    return this.sellersService.getSettings(user.sellerId);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: UserPayload,
    @Body() body: { whatsappNumber?: string; currency?: string },
  ) {
    return this.sellersService.updateSettings(user.sellerId, body);
  }
}
