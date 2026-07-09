-- Parche idempotente del esquema GHome (ejecutar si drizzle-kit push quedó incompleto)
-- Uso: bash scripts/ghome-schema-patch.sh

-- OAuth clientes
DO $$ BEGIN
  CREATE TYPE client_auth_provider AS ENUM ('password', 'google', 'apple');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS auth_provider client_auth_provider DEFAULT 'password';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS provider_subject text;

UPDATE clients SET auth_provider = 'password' WHERE auth_provider IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_provider_company_idx
  ON clients (provider_subject, company_id)
  WHERE provider_subject IS NOT NULL;

-- Facturas: firmas y proforma
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS received_by text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dispatched_by text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_fiscal boolean NOT NULL DEFAULT true;

UPDATE invoices SET is_fiscal = true WHERE is_fiscal IS NULL;

-- Líneas de factura: unidad de medida
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'unidad';

UPDATE invoice_items SET unit_label = 'unidad' WHERE unit_label IS NULL;

-- Difusión WhatsApp (listas de broadcast)
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
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  phone text NOT NULL,
  notes text,
  client_id uuid REFERENCES clients(id),
  created_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS broadcast_contacts_phone_company_idx ON broadcast_contacts (phone, company_id);

CREATE TABLE IF NOT EXISTS broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
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
  company_id uuid NOT NULL REFERENCES companies(id),
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
