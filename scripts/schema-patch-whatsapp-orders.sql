-- Idempotent patch: WhatsApp order sync (2026)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_ticket_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE TABLE IF NOT EXISTS whatsapp_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  ticket_id uuid REFERENCES whatsapp_tickets(id),
  order_id uuid REFERENCES orders(id),
  evolution_message_id text,
  remote_jid text NOT NULL,
  direction text NOT NULL,
  text_preview text,
  raw_payload jsonb,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_message_events_evo_msg_idx
  ON whatsapp_message_events (seller_id, evolution_message_id)
  WHERE evolution_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_whatsapp_ticket_idx ON orders (whatsapp_ticket_id);
CREATE INDEX IF NOT EXISTS orders_source_idx ON orders (seller_id, source);
