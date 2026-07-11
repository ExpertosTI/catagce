#!/usr/bin/env bash
# Sincroniza EVOLUTION_* en catagce_api (Swarm) desde .env + .evolution.local
# .evolution.local gana en claves EVOLUTION_* (instancia corporativa).
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

if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ] || [ -z "$EVOLUTION_INSTANCE" ]; then
  echo "❌ Faltan EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE" >&2
  echo "   En .evolution.local pon INSTANCE=RENACE.TECH (número corporativo Connected)." >&2
  exit 1
fi

echo "── sync-evolution-env: ${SVC} ────────────────────"
echo "   INSTANCE=${EVOLUTION_INSTANCE}"
echo "   URL=${EVOLUTION_API_URL}"

docker service update --detach=false \
  --env-rm EVOLUTION_API_URL \
  --env-rm EVOLUTION_API_KEY \
  --env-rm EVOLUTION_INSTANCE \
  --env-add "EVOLUTION_API_URL=${EVOLUTION_API_URL}" \
  --env-add "EVOLUTION_API_KEY=${EVOLUTION_API_KEY}" \
  --env-add "EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}" \
  "$SVC"

echo "✅ ${SVC} → EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}"
