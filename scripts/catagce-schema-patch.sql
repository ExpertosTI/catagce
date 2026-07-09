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

-- WhatsApp inbox (Whaticket-style)
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
