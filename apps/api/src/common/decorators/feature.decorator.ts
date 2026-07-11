import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'requiredFeature';
export const RequireFeature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);

export const PLATFORM_ADMIN_KEY = 'requirePlatformAdmin';
export const RequirePlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
