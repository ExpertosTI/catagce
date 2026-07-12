/** WhatsApp Cloud API (Meta oficial) — OTP / notificaciones de plataforma */

function env(name: string) {
  return String(process.env[name] ?? '').trim().replace(/^["']|["']$/g, '');
}

export type MetaCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  otpTemplate: string;
  otpLang: string;
  /** copy_code auth templates pass OTP in body + button */
  graphVersion: string;
};

export function metaCloudFromEnv(): MetaCloudConfig | null {
  const accessToken = env('META_WA_ACCESS_TOKEN');
  const phoneNumberId = env('META_WA_PHONE_NUMBER_ID');
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken,
    phoneNumberId,
    wabaId: env('META_WA_WABA_ID') || undefined,
    otpTemplate: env('META_WA_OTP_TEMPLATE') || 'catagce_otp',
    otpLang: env('META_WA_OTP_LANG') || 'es',
    graphVersion: env('META_WA_GRAPH_VERSION') || 'v21.0',
  };
}

export function metaCloudConfigured() {
  return Boolean(metaCloudFromEnv());
}
