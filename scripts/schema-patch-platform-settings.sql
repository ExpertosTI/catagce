-- WhatsApp de plataforma (OTP / uso general) — configurable por admin
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

INSERT INTO platform_settings (id, evolution_instance, profile_display_name)
VALUES (1, 'RENACE.TECH', 'RENACE.TECH')
ON CONFLICT (id) DO UPDATE SET
  evolution_instance = COALESCE(NULLIF(platform_settings.evolution_instance, ''), EXCLUDED.evolution_instance),
  profile_display_name = COALESCE(NULLIF(platform_settings.profile_display_name, ''), EXCLUDED.profile_display_name);
