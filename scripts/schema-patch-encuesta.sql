-- Encuesta de nombres (3 días) — idempotente
CREATE TABLE IF NOT EXISTS name_survey_meta (
  id serial PRIMARY KEY,
  is_open boolean NOT NULL DEFAULT true,
  ends_at timestamp NOT NULL,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS name_survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS name_survey_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_key text NOT NULL UNIQUE,
  rank1 uuid NOT NULL REFERENCES name_survey_options(id),
  rank2 uuid NOT NULL REFERENCES name_survey_options(id),
  rank3 uuid NOT NULL REFERENCES name_survey_options(id),
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS name_survey_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_key text NOT NULL,
  suggestion text NOT NULL,
  created_at timestamp DEFAULT now()
);

INSERT INTO name_survey_options (name, sort_order) VALUES
  ('CatDif', 1),
  ('RenDif', 2),
  ('Catadif', 3),
  ('Difcata', 4),
  ('Cataluz', 5)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = true;

-- Una sola fila meta: abrir 3 días desde ahora si no existe
INSERT INTO name_survey_meta (id, is_open, ends_at)
SELECT 1, true, now() + interval '3 days'
WHERE NOT EXISTS (SELECT 1 FROM name_survey_meta WHERE id = 1);
