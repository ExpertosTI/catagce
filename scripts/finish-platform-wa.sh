#!/usr/bin/env bash
# Cierre ops: WA de notificaciones configurable por admin (QR), sin hardcode.
# - Genera ENCRYPTION_KEY si falta (upsert, no pisa)
# - Limpia platform_settings.evolution_* (deja de usar RENACE.TECH / número viejo)
# - Sync Evolution URL/KEY al Swarm sin forzar instancia
# - Reaplica ENCRYPTION_KEY en catagce_api
#
# Uso en VPS:
#   cd /opt/QuickCtgo && bash scripts/finish-platform-wa.sh
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

ENV_FILE=".env"
SVC="${STACK_NAME:-catagce}_api"

upsert_kv_empty_only() {
  local file="$1" key="$2" val="$3"
  touch "$file"
  chmod 600 "$file" 2>/dev/null || true
  if grep -q "^${key}=.\+" "$file" 2>/dev/null; then
    echo "   ${key} ya tiene valor — no se pisa"
    return 0
  fi
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$file"
    rm -f "${file}.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
  echo "   Upsert ${key}"
}

echo "═══ 1) ENCRYPTION_KEY (solo si vacío) ═══"
NEW_KEY="$(openssl rand -hex 32)"
upsert_kv_empty_only "$ENV_FILE" "ENCRYPTION_KEY" "$NEW_KEY"
# shellcheck disable=SC1091
set -a; source "$ENV_FILE"; set +a
if [ -z "${ENCRYPTION_KEY:-}" ]; then
  echo "❌ ENCRYPTION_KEY sigue vacío" >&2
  exit 1
fi
echo "   OK (len=${#ENCRYPTION_KEY})"

echo ""
echo "═══ 2) Comentar EVOLUTION_INSTANCE hardcodeado ═══"
for f in .evolution.local .env; do
  [ -f "$f" ] || continue
  if grep -q '^EVOLUTION_INSTANCE=.\+' "$f" 2>/dev/null; then
    sed -i.bak 's/^EVOLUTION_INSTANCE=.*/# EVOLUTION_INSTANCE=/' "$f"
    rm -f "${f}.bak"
    echo "   Comentado en $f"
  else
    echo "   $f — sin INSTANCE activa"
  fi
done

echo ""
echo "═══ 3) Limpiar WA de plataforma en DB (admin debe escanear QR) ═══"
db_cid="$(docker ps -qf name=catagce_db | head -1 || true)"
if [ -n "$db_cid" ]; then
  docker exec -i "$db_cid" psql -U catagce_admin -d catagce_prod <<'SQL'
UPDATE platform_settings
SET
  evolution_instance = NULL,
  evolution_token = NULL,
  evolution_status = NULL,
  evolution_phone = NULL,
  profile_display_name = COALESCE(NULLIF(profile_display_name, ''), 'Catagce'),
  notify_channel = 'evolution',
  updated_at = now()
WHERE id = 1;

SELECT id, evolution_instance, evolution_phone, notify_channel, profile_display_name
FROM platform_settings WHERE id = 1;
SQL
else
  echo "   ⚠️  catagce_db no encontrado — omitido"
fi

echo ""
echo "═══ 4) Sync Evolution URL/KEY (sin INSTANCE) ═══"
bash scripts/sync-evolution-env.sh

echo ""
echo "═══ 5) Inyectar ENCRYPTION_KEY en ${SVC} ═══"
# shellcheck disable=SC1091
set -a; source "$ENV_FILE"; set +a
docker service update --detach=false \
  --env-rm ENCRYPTION_KEY \
  --env-add "ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
  "$SVC"

echo ""
echo "✅ Listo."
echo "   Entra a https://catagce.renace.tech/dashboard/platform/whatsapp"
echo "   → Mostrar QR / Cambiar número y escanea el WhatsApp de notificaciones."
