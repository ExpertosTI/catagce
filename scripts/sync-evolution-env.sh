#!/usr/bin/env bash
# Sincroniza EVOLUTION_API_URL + EVOLUTION_API_KEY en catagce_api (Swarm).
# NO fuerza un número/instancia: el WhatsApp de notificaciones lo elige el
# platform admin en /dashboard/platform/whatsapp (QR → platform_settings).
# URL/KEY se leen de .env + .evolution.local (no se inventan).
# NO usar el token de instancia (45FCC9…) como EVOLUTION_API_KEY.
# NO llama restart/connect/logout en evoapi — solo env del servicio Swarm.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

SVC="${STACK_NAME:-catagce}_api"

EVOLUTION_API_URL=""
EVOLUTION_API_KEY=""
EVOLUTION_INSTANCE=""

read_kv_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "$key" | tr -d '[:space:]')"
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    case "$key" in
      EVOLUTION_API_URL|EVOLUTION_API_KEY|EVOLUTION_INSTANCE)
        printf -v "$key" '%s' "$val"
        ;;
    esac
  done < "$file"
}

read_kv_file .env
read_kv_file .evolution.local

if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ]; then
  echo "❌ Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en .env / .evolution.local" >&2
  exit 1
fi

echo "── sync-evolution-env: ${SVC} ────────────────────"
echo "   URL=${EVOLUTION_API_URL}"
if [ -n "$EVOLUTION_INSTANCE" ]; then
  echo "   INSTANCE=${EVOLUTION_INSTANCE} (solo fallback; preferir QR en panel admin)"
else
  echo "   INSTANCE=(vacío — el número de notificaciones se configura en el panel)"
fi

UPDATE_ARGS=(
  --detach=false
  --env-rm EVOLUTION_API_URL
  --env-rm EVOLUTION_API_KEY
  --env-rm EVOLUTION_INSTANCE
  --env-add "EVOLUTION_API_URL=${EVOLUTION_API_URL}"
  --env-add "EVOLUTION_API_KEY=${EVOLUTION_API_KEY}"
)

# Solo reinyectar INSTANCE si ya estaba en archivo (no inventar RENACE.TECH).
if [ -n "$EVOLUTION_INSTANCE" ]; then
  UPDATE_ARGS+=(--env-add "EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}")
fi

docker service update "${UPDATE_ARGS[@]}" "$SVC"

echo "✅ ${SVC} → Evolution URL/KEY sincronizados"
