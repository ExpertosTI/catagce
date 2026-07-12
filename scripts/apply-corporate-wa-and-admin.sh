#!/usr/bin/env bash
# Ops QuickCtgo — instancia corporativa WhatsApp + super admin
# Valores evidenciado (no inventar):
#   Evolution Manager: instancia RENACE.TECH (JID 18495684958)
#   Diagnóstico del repo: admin@renace.tech
# No reinicia ni reconecta Evolution (eso dejó state=close/connecting).
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

INSTANCE="RENACE.TECH"
ADMIN_EMAIL="admin@renace.tech"
EVO_FILE=".evolution.local"
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

echo "═══ 1) .evolution.local → EVOLUTION_INSTANCE=${INSTANCE} ═══"
upsert_kv "$EVO_FILE" "EVOLUTION_INSTANCE" "$INSTANCE"
if [ -f "$ENV_FILE" ]; then
  url="$(grep -E '^EVOLUTION_API_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
  key="$(grep -E '^EVOLUTION_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
  if [ -n "$url" ] && ! grep -q '^EVOLUTION_API_URL=' "$EVO_FILE"; then
    upsert_kv "$EVO_FILE" "EVOLUTION_API_URL" "$url"
  fi
  if [ -n "$key" ] && ! grep -q '^EVOLUTION_API_KEY=' "$EVO_FILE"; then
    upsert_kv "$EVO_FILE" "EVOLUTION_API_KEY" "$key"
  fi
fi
grep -E '^EVOLUTION_' "$EVO_FILE" | sed 's/EVOLUTION_API_KEY=.*/EVOLUTION_API_KEY=***/'

echo ""
echo "═══ 2) SUPER_ADMIN_EMAILS=${ADMIN_EMAIL} (solo si vacío en .env) ═══"
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
echo "═══ 3) Sync Evolution → Swarm catagce_api ═══"
# También pisa .env EVOLUTION_INSTANCE=renace-biz si aún estaba
if [ -f "$ENV_FILE" ]; then
  upsert_kv "$ENV_FILE" "EVOLUTION_INSTANCE" "$INSTANCE"
fi
bash scripts/sync-evolution-env.sh

got="$(docker service inspect catagce_api --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' | grep '^EVOLUTION_INSTANCE=' || true)"
echo "   Swarm: ${got}"
if [ "$got" != "EVOLUTION_INSTANCE=${INSTANCE}" ]; then
  echo "❌ Swarm no quedó en ${INSTANCE} (sigue: ${got:-vacío})" >&2
  exit 1
fi

echo ""
echo "═══ 4) platform_admins en DB ═══"
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
echo "═══ 5) Verificar env del servicio ═══"
docker service inspect catagce_api --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' \
  | grep -E 'EVOLUTION_INSTANCE|SUPER_ADMIN' || true

echo ""
echo "═══ 6) Nombre visible en WhatsApp (no el número) ═══"
bash scripts/set-corporate-wa-profile-name.sh

echo ""
echo "✅ Listo. Cierra sesión en la web y entra con ${ADMIN_EMAIL}."
echo "   Debe verse el icono Admin y OTP desde ${INSTANCE} con nombre «RENACE.TECH»."
