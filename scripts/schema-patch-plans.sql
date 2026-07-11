-- Planes Free / Pro / Business + features modulares + platform admins
-- Idempotente — no DROP

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'free';

CREATE TABLE IF NOT EXISTS plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL REFERENCES plans(code),
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  limit_value integer,
  updated_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_features_plan_feature_idx
  ON plan_features (plan_code, feature_key);

CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

INSERT INTO plans (code, name, description, sort_order) VALUES
  ('free', 'Gratuito', 'Para empezar: catálogos básicos y WhatsApp', 0),
  ('pro', 'Pro', 'Difusión, inventario y más catálogos', 1),
  ('business', 'Business', 'Todo incluido: IA, sin límites prácticos', 2)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Helper: upsert feature
-- free
INSERT INTO plan_features (plan_code, feature_key, enabled, limit_value) VALUES
  ('free', 'products', true, 50),
  ('free', 'catalogs', true, 2),
  ('free', 'whatsapp_connect', true, NULL),
  ('free', 'catalog_wa_share', true, NULL),
  ('free', 'broadcast', true, NULL),
  ('free', 'ai', false, NULL),
  ('free', 'inventory', true, NULL),
  ('free', 'analytics', true, 1)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- Producto existente: Difusión e Inventario no deben quedar bloqueados en Free
UPDATE plan_features
SET enabled = true, updated_at = now()
WHERE plan_code = 'free' AND feature_key IN ('broadcast', 'inventory');

INSERT INTO plan_features (plan_code, feature_key, enabled, limit_value) VALUES
  ('pro', 'products', true, 500),
  ('pro', 'catalogs', true, 20),
  ('pro', 'whatsapp_connect', true, NULL),
  ('pro', 'catalog_wa_share', true, NULL),
  ('pro', 'broadcast', true, NULL),
  ('pro', 'ai', false, NULL),
  ('pro', 'inventory', true, NULL),
  ('pro', 'analytics', true, NULL)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

INSERT INTO plan_features (plan_code, feature_key, enabled, limit_value) VALUES
  ('business', 'products', true, NULL),
  ('business', 'catalogs', true, NULL),
  ('business', 'whatsapp_connect', true, NULL),
  ('business', 'catalog_wa_share', true, NULL),
  ('business', 'broadcast', true, NULL),
  ('business', 'ai', true, NULL),
  ('business', 'inventory', true, NULL),
  ('business', 'analytics', true, NULL)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- Seed platform admin from env is done at runtime; optional local default:
-- INSERT INTO platform_admins (email, name) VALUES ('admin@renace.tech', 'Super Admin') ON CONFLICT DO NOTHING;

UPDATE sellers SET plan_code = 'free' WHERE plan_code IS NULL OR plan_code = '';
