-- Meta Cloud API (oficial) para OTP / notificaciones de plataforma
-- Idempotente — no DROP

CREATE TABLE IF NOT EXISTS platform_settings (
  id serial PRIMARY KEY,
  evolution_instance text,
  evolution_token text,
  evolution_status text,
  evolution_phone text,
  profile_display_name text,
  updated_at timestamp DEFAULT now()
);

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS notify_channel text DEFAULT 'cloud';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_access_token text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_phone_number_id text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_waba_id text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_otp_template text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_otp_lang text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_notify_template text;

INSERT INTO platform_settings (id, evolution_instance, profile_display_name, notify_channel)
VALUES (1, 'RENACE.TECH', 'RENACE.TECH', 'cloud')
ON CONFLICT (id) DO UPDATE SET
  evolution_instance = COALESCE(NULLIF(platform_settings.evolution_instance, ''), EXCLUDED.evolution_instance),
  profile_display_name = COALESCE(NULLIF(platform_settings.profile_display_name, ''), EXCLUDED.profile_display_name),
  notify_channel = COALESCE(NULLIF(platform_settings.notify_channel, ''), 'cloud');
