-- Enterprise P0: Meta events + API key hashing
-- Idempotente

CREATE TABLE IF NOT EXISTS meta_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid text NOT NULL,
  phone_number_id text,
  status text NOT NULL,
  recipient_id text,
  payload jsonb,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meta_message_events_wamid_idx ON meta_message_events (wamid);
CREATE INDEX IF NOT EXISTS meta_message_events_created_idx ON meta_message_events (created_at);

ALTER TABLE seller_api_keys ADD COLUMN IF NOT EXISTS key_hash text;
ALTER TABLE seller_api_keys ADD COLUMN IF NOT EXISTS key_prefix text;
ALTER TABLE seller_api_keys ALTER COLUMN key DROP NOT NULL;

-- Quitar UNIQUE estricto de key si existía (permite NULL tras hash)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'seller_api_keys'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(key)%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE seller_api_keys DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DROP INDEX IF EXISTS seller_api_keys_key_key;
DROP INDEX IF EXISTS seller_api_keys_key_unique;

CREATE UNIQUE INDEX IF NOT EXISTS seller_api_keys_key_hash_uidx
  ON seller_api_keys (key_hash) WHERE key_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seller_api_keys_key_uidx
  ON seller_api_keys (key) WHERE key IS NOT NULL;
