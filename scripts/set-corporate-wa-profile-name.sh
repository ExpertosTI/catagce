#!/usr/bin/env bash
# Cliente HTTP → Evolution remoto (https://evoapi.renace.tech).
# Evolution NO corre en /opt/QuickCtgo; este script no toca Docker local de Evolution.
# Objetivo: POST /chat/updateProfileName en instancia RENACE.TECH (18495684958).
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
  echo "❌ Faltan EVOLUTION_API_URL / EVOLUTION_API_KEY en .env o .evolution.local" >&2
  exit 1
fi

# Seguridad: no apuntar a localhost / mismo host por error
case "$URL" in
  http://127.*|http://localhost*|https://127.*|https://localhost*)
    echo "❌ EVOLUTION_API_URL=$URL parece local. Evolution es remoto (evoapi.renace.tech)." >&2
    exit 1
    ;;
esac

ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"

echo "── Cliente QuickCtgo → Evolution remoto ──"
echo "   EVOLUTION_API_URL=${URL}"
echo "   instance=${INSTANCE}"
echo "   displayName=${DISPLAY_NAME}"

echo "── GET connectionState (remoto) ──"
STATE_JSON="$(curl -sS "${URL}/instance/connectionState/${ENC}" -H "apikey: ${KEY}" || true)"
echo "$STATE_JSON" | head -c 500; echo
STATE="$(echo "$STATE_JSON" | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print(d.get('instance',{}).get('state') or d.get('state') or d.get('status') or '')
except Exception:
 print('')" 2>/dev/null || true)"
echo "   state=${STATE:-desconocido}"

echo "── POST updateProfileName (remoto) ──"
HTTP="$(curl -sS -o /tmp/evo-profile-name.json -w '%{http_code}' \
  -X POST "${URL}/chat/updateProfileName/${ENC}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${KEY}" \
  -d "{\"name\":\"${DISPLAY_NAME}\"}")"
echo "   HTTP ${HTTP}"
cat /tmp/evo-profile-name.json; echo

BODY="$(cat /tmp/evo-profile-name.json 2>/dev/null || true)"
if echo "$BODY" | grep -qi 'Connection Closed'; then
  echo "" >&2
  echo "❌ Evolution remoto respondió Connection Closed al cambiar el nombre." >&2
  echo "   Eso es la sesión WhatsApp en el servidor de evoapi (no en QuickCtgo)." >&2
  echo "   En https://evoapi.renace.tech → instancia RENACE.TECH:" >&2
  echo "   Connected debe estar estable; si hace falta RESTART ahí (en evoapi), luego:" >&2
  echo "   bash scripts/set-corporate-wa-profile-name.sh" >&2
  exit 1
fi

if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ updateProfileName falló HTTP ${HTTP} contra ${URL}" >&2
  exit 1
fi

echo "✅ Nombre «${DISPLAY_NAME}» pedido a Evolution remoto."
echo "   WhatsApp puede seguir mostrando el número en chats viejos o contactos guardados como número."
