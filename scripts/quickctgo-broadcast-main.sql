-- Parche broadcast para schema MAIN (sellers) — idempotente
DO $$ BEGIN
  CREATE TYPE broadcast_campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_job_status AS ENUM ('pending', 'sending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS broadcast_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  name text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS broadcast_contacts_phone_seller_idx ON broadcast_contacts (phone, seller_id);

CREATE TABLE IF NOT EXISTS broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  name text NOT NULL,
  color text DEFAULT '#25D366',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_list_members (
  list_id uuid NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES broadcast_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (list_id, contact_id)
);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  list_id uuid NOT NULL REFERENCES broadcast_lists(id),
  name text NOT NULL,
  message text NOT NULL,
  media_url text,
  media_type text,
  interval_min_sec integer NOT NULL DEFAULT 45,
  interval_max_sec integer NOT NULL DEFAULT 90,
  status broadcast_campaign_status NOT NULL DEFAULT 'draft',
  start_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_campaign_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES broadcast_contacts(id),
  phone text NOT NULL,
  contact_name text,
  status broadcast_job_status NOT NULL DEFAULT 'pending',
  scheduled_at timestamp NOT NULL,
  sent_at timestamp,
  error text
);
