#!/usr/bin/env bash
# Solo updateProfileName en evoapi remoto si la sesión YA está open.
# NO llama restart ni connect (eso regenera QR y deja state=connecting).
# Credenciales: .env + .evolution.local (EVOLUTION_API_URL / EVOLUTION_API_KEY).
# Instancia corporativa fija: RENACE.TECH
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

INSTANCE="RENACE.TECH"
DISPLAY_NAME="RENACE.TECH"
URL=""
KEY=""

read_kv() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    local k="${line%%=*}"
    local v="${line#*=}"
    k="$(echo "$k" | tr -d '[:space:]')"
    v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    case "$k" in
      EVOLUTION_API_URL) URL="$v" ;;
      EVOLUTION_API_KEY) KEY="$v" ;;
    esac
  done < "$file"
}

read_kv .env
read_kv .evolution.local
URL="${URL%/}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "❌ Faltan EVOLUTION_API_URL / EVOLUTION_API_KEY" >&2
  exit 1
fi

ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"

STATE="$(curl -sS -m 15 "${URL}/instance/connectionState/${ENC}" -H "apikey: ${KEY}" \
  | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print((d.get('instance') or {}).get('state') or d.get('state') or '')
except Exception:
 print('')" 2>/dev/null || true)"

echo "── ${URL} / ${INSTANCE} state=${STATE:-?} ──"

if [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" != "open" ]; then
  echo "⏭️  Sesión no open — no se llama updateProfileName ni restart/connect."
  echo "   Catagce ya usa EVOLUTION_INSTANCE=${INSTANCE} con las credenciales de .evolution.local."
  exit 0
fi

HTTP="$(curl -sS -m 30 -o /tmp/evo-profile-name.json -w '%{http_code}' \
  -X POST "${URL}/chat/updateProfileName/${ENC}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${KEY}" \
  -d "{\"name\":\"${DISPLAY_NAME}\"}")"
echo "updateProfileName HTTP ${HTTP}"
cat /tmp/evo-profile-name.json; echo
[ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]
