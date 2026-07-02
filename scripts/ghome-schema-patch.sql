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
