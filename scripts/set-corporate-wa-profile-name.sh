#!/usr/bin/env bash
# Solo HTTP a Evolution remoto https://evoapi.renace.tech (NO corre en QuickCtgo).
#
# Evidencia (terminal):
#   connectionState=close
#   PUT /instance/restart/RENACE.TECH → 404 (método incorrecto)
#   GET /instance/connect → QR + state=connecting (forzar QR rompe sesión previa)
#
# Correcto: POST /instance/restart/{instance}, esperar open, luego updateProfileName.
# No llamar connect desde aquí (eso pide QR en el Manager).
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
case "$URL" in
  *evoapi.renace.tech*) ;;
  *)
    echo "❌ URL debe ser evoapi.renace.tech, got: ${URL}" >&2
    exit 1
    ;;
esac

ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"

state_of() {
  curl -sS "${URL}/instance/connectionState/${ENC}" -H "apikey: ${KEY}" \
    | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print((d.get('instance') or {}).get('state') or d.get('state') or '')
except Exception:
 print('')" 2>/dev/null || true
}

echo "── Remoto ${URL} instancia=${INSTANCE} ──"
STATE="$(state_of)"
echo "   connectionState=${STATE:-desconocido}"

if [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" != "open" ]; then
  echo "── POST /instance/restart/${INSTANCE} (método correcto; PUT da 404) ──"
  HTTP_R="$(curl -sS -o /tmp/evo-restart.json -w '%{http_code}' \
    -X POST "${URL}/instance/restart/${ENC}" \
    -H "apikey: ${KEY}")"
  echo "   HTTP ${HTTP_R} $(head -c 180 /tmp/evo-restart.json 2>/dev/null || true)"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    sleep 3
    STATE="$(state_of)"
    echo "   poll ${i}: ${STATE:-…}"
    [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" = "open" ] && break
  done
fi

STATE="$(state_of)"
if [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" != "open" ]; then
  echo "❌ Sesión sigue en «${STATE:-close}» en evoapi." >&2
  echo "   Login WhatsApp en Catagce usa ready=open; por eso sale «no disponible»." >&2
  echo "   En https://evoapi.renace.tech abre RENACE.TECH → Connect / escanea QR hasta Connected." >&2
  echo "   No uses connect desde este script (genera QR y deja connecting)." >&2
  exit 1
fi

echo "── POST updateProfileName → ${DISPLAY_NAME} ──"
HTTP="$(curl -sS -o /tmp/evo-profile-name.json -w '%{http_code}' \
  -X POST "${URL}/chat/updateProfileName/${ENC}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${KEY}" \
  -d "{\"name\":\"${DISPLAY_NAME}\"}")"
echo "   HTTP ${HTTP}"
cat /tmp/evo-profile-name.json; echo

if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ updateProfileName falló HTTP ${HTTP}" >&2
  exit 1
fi

echo "✅ Sesión open + nombre «${DISPLAY_NAME}». Login WhatsApp debería volver a ready."
