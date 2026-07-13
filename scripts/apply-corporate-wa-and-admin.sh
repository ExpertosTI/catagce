#!/usr/bin/env bash
# Ops QuickCtgo — asegurar platform admin (sin forzar número WhatsApp).
# El WA de notificaciones lo elige el admin con QR en /dashboard/platform/whatsapp.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-admin@renace.tech}"
ENV_FILE=".env"

upsert_kv() {
  local file="$1" key="$2" val="$3"
  touch "$file"
  chmod 600 "$file" 2>/dev/null || true
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$file"
    rm -f "${file}.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

echo "═══ 1) SUPER_ADMIN_EMAILS (solo si vacío en .env) ═══"
if [ -f "$ENV_FILE" ]; then
  if grep -q '^SUPER_ADMIN_EMAILS=.\+' "$ENV_FILE"; then
    echo "   Ya hay SUPER_ADMIN_EMAILS — no se pisa:"
    grep '^SUPER_ADMIN_EMAILS=' "$ENV_FILE"
  else
    upsert_kv "$ENV_FILE" "SUPER_ADMIN_EMAILS" "$ADMIN_EMAIL"
    echo "   Upsert SUPER_ADMIN_EMAILS=${ADMIN_EMAIL}"
  fi
else
  echo "   ⚠️  No hay .env — omitido"
fi

echo ""
echo "═══ 2) Sync Evolution URL/KEY (no fuerza INSTANCE) ═══"
bash scripts/sync-evolution-env.sh || true

echo ""
echo "═══ 3) platform_admins en DB ═══"
db_cid="$(docker ps -qf name=catagce_db | head -1 || true)"
if [ -n "$db_cid" ]; then
  docker exec -i "$db_cid" psql -U catagce_admin -d catagce_prod <<SQL
INSERT INTO platform_admins (email, name, is_active)
VALUES ('${ADMIN_EMAIL}', 'Super Admin', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;
SELECT email, is_active FROM platform_admins ORDER BY email;
SQL
else
  echo "   ⚠️  catagce_db no encontrado — omitido INSERT"
fi

echo ""
echo "✅ Listo. Cierra sesión y entra con tu email de admin."
echo "   WhatsApp de notificaciones: /dashboard/platform/whatsapp → escanear QR."
