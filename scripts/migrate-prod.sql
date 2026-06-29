-- Migración incremental Catagce (ejecutar una vez en producción)
-- docker exec -i $(docker ps -q -f name=catagce_db.1) psql -U catagce_admin -d catagce_prod < scripts/migrate-prod.sql

ALTER TABLE seller_settings ADD COLUMN IF NOT EXISTS google_ai_api_key text;
ALTER TABLE seller_settings ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gemini-2.5-flash';
ALTER TABLE seller_settings ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;
ALTER TABLE seller_settings ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE seller_settings ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  user_id uuid,
  title text DEFAULT 'Nueva conversación',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id),
  role text NOT NULL,
  content text NOT NULL,
  tool_calls jsonb,
  created_at timestamp DEFAULT now()
);

-- Marcar onboarding completo para vendedores existentes
UPDATE seller_settings SET onboarding_completed = true WHERE onboarding_completed IS NULL OR onboarding_completed = false;
