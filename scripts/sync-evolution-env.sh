#!/usr/bin/env bash
# Sincroniza EVOLUTION_* en catagce_api (Swarm).
# Instancia corporativa FIJA (evidencia Evolution Manager Connected):
#   RENACE.TECH — JID 18495684958@s.whatsapp.net
# URL/KEY se leen de .env + .evolution.local (no se inventan).
# NO usar el token de instancia (45FCC9…) como EVOLUTION_API_KEY.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

SVC="${STACK_NAME:-catagce}_api"
CORPORATE_INSTANCE="RENACE.TECH"

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

read_kv_file .env
read_kv_file .evolution.local

# Forzar línea corporativa (antes quedaba renace-biz en .env y se reaplicaba)
EVOLUTION_INSTANCE="$CORPORATE_INSTANCE"
upsert_kv .evolution.local "EVOLUTION_INSTANCE" "$CORPORATE_INSTANCE"
if [ -f .env ]; then
  upsert_kv .env "EVOLUTION_INSTANCE" "$CORPORATE_INSTANCE"
fi

if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ]; then
  echo "❌ Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en .env / .evolution.local" >&2
  exit 1
fi

echo "── sync-evolution-env: ${SVC} ────────────────────"
echo "   INSTANCE=${EVOLUTION_INSTANCE} (forzado corporativo / 18495684958)"
echo "   URL=${EVOLUTION_API_URL}"
if [ "$EVOLUTION_INSTANCE" = "renace-biz" ]; then
  echo "❌ Abort: instancia vieja renace-biz" >&2
  exit 1
fi

docker service update --detach=false \
  --env-rm EVOLUTION_API_URL \
  --env-rm EVOLUTION_API_KEY \
  --env-rm EVOLUTION_INSTANCE \
  --env-add "EVOLUTION_API_URL=${EVOLUTION_API_URL}" \
  --env-add "EVOLUTION_API_KEY=${EVOLUTION_API_KEY}" \
  --env-add "EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}" \
  "$SVC"

echo "✅ ${SVC} → EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}"
