-- Solicitudes de upgrade/pago + índices — idempotente
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_note text,
  payment_method text,
  amount_claimed text,
  admin_note text,
  reviewed_by text,
  reviewed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_change_requests_status_idx
  ON plan_change_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS plan_change_requests_seller_idx
  ON plan_change_requests (seller_id, created_at DESC);
