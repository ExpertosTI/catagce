-- Meta Cloud API + Evolution (OTP / notificaciones de plataforma)
-- Idempotente — no DROP
-- El número de envío NO se hardcodea: lo elige el admin con QR en /dashboard/platform/whatsapp

CREATE TABLE IF NOT EXISTS platform_settings (
  id serial PRIMARY KEY,
  evolution_instance text,
  evolution_token text,
  evolution_status text,
  evolution_phone text,
  profile_display_name text,
  updated_at timestamp DEFAULT now()
);

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS notify_channel text DEFAULT 'evolution';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_access_token text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_phone_number_id text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_waba_id text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_otp_template text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_otp_lang text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS meta_notify_template text;

INSERT INTO platform_settings (id, profile_display_name, notify_channel)
VALUES (1, 'Catagce', 'evolution')
ON CONFLICT (id) DO NOTHING;
