-- Parche idempotente Catagce (main) — códigos WhatsApp
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_codes_phone_purpose_idx ON verification_codes (phone, purpose);

-- WhatsApp inbox
DO $$ BEGIN
  CREATE TYPE whatsapp_ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  name text NOT NULL,
  color text DEFAULT '#00D1FF',
  evolution_label_id text,
  sort_order integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_labels_seller_name_idx ON whatsapp_labels (seller_id, name);

CREATE TABLE IF NOT EXISTS whatsapp_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  remote_jid text NOT NULL,
  phone text NOT NULL,
  contact_name text,
  status whatsapp_ticket_status DEFAULT 'open',
  label_ids text[] DEFAULT '{}',
  last_message_at timestamp,
  last_message_preview text,
  unread_count integer DEFAULT 0,
  assigned_user_id uuid REFERENCES seller_users(id),
  is_group boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_tickets_seller_jid_idx ON whatsapp_tickets (seller_id, remote_jid);

CREATE TABLE IF NOT EXISTS whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  title text NOT NULL,
  body text NOT NULL,
  shortcut text,
  created_at timestamp DEFAULT now()
);

-- Listas de difusión WhatsApp
DO $$ BEGIN
  CREATE TYPE broadcast_campaign_status AS ENUM ('draft', 'running', 'paused', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE broadcast_job_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  name text NOT NULL,
  description text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text NOT NULL,
  buyer_contact_id uuid REFERENCES buyer_contacts(id),
  created_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS broadcast_list_members_list_phone_idx ON broadcast_list_members (list_id, phone);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  list_id uuid NOT NULL REFERENCES broadcast_lists(id),
  name text NOT NULL,
  message_text text NOT NULL,
  media_url text,
  status broadcast_campaign_status DEFAULT 'draft',
  delay_min_sec integer DEFAULT 45,
  delay_max_sec integer DEFAULT 90,
  scheduled_at timestamp,
  started_at timestamp,
  completed_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  contact_name text,
  status broadcast_job_status DEFAULT 'pending',
  scheduled_at timestamp,
  sent_at timestamp,
  error text,
  created_at timestamp DEFAULT now()
);
