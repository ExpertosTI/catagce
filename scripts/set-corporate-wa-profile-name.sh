#!/usr/bin/env bash
# Solo HTTP remoto a https://evoapi.renace.tech (Evolution NO está en QuickCtgo).
# Evidencia del fallo: connectionState.state=close → updateProfileName = Connection Closed.
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
    echo "❌ EVOLUTION_API_URL inesperado: ${URL}" >&2
    echo "   Debe ser https://evoapi.renace.tech (host remoto de Evolution)." >&2
    exit 1
    ;;
esac

ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"

evo_get() { curl -sS "$1" -H "apikey: ${KEY}"; }
evo_post() { curl -sS -X POST "$1" -H "Content-Type: application/json" -H "apikey: ${KEY}" ${2:+-d "$2"}; }
evo_put()  { curl -sS -X PUT  "$1" -H "apikey: ${KEY}"; }

state_of() {
  evo_get "${URL}/instance/connectionState/${ENC}" | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print((d.get('instance') or {}).get('state') or d.get('state') or '')
except Exception:
 print('')" 2>/dev/null || true
}

echo "── Remoto ${URL} / ${INSTANCE} ──"
STATE="$(state_of)"
echo "   connectionState=${STATE:-desconocido}"

if [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" != "open" ]; then
  echo "── Sesión close → restart + connect en evoapi (API remota) ──"
  evo_put "${URL}/instance/restart/${ENC}" >/tmp/evo-restart.json 2>/dev/null || true
  echo "   restart: $(head -c 200 /tmp/evo-restart.json 2>/dev/null || true)"
  sleep 4
  evo_get "${URL}/instance/connect/${ENC}" >/tmp/evo-connect.json 2>/dev/null || true
  echo "   connect: $(head -c 200 /tmp/evo-connect.json 2>/dev/null || true)"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 3
    STATE="$(state_of)"
    echo "   poll ${i}: ${STATE:-…}"
    [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" = "open" ] && break
  done
fi

STATE="$(state_of)"
if [ "$(echo "$STATE" | tr '[:upper:]' '[:lower:]')" != "open" ]; then
  echo "❌ Sigue state=${STATE:-close} en evoapi." >&2
  echo "   Hay que escanear QR / Connect en https://evoapi.renace.tech → RENACE.TECH" >&2
  echo "   (QuickCtgo no hospeda Evolution; solo puede llamar la API.)" >&2
  if grep -q 'base64\|qrcode' /tmp/evo-connect.json 2>/dev/null; then
    echo "   connect devolvió QR — ábrelo en el Manager de evoapi." >&2
  fi
  exit 1
fi

echo "── updateProfileName → ${DISPLAY_NAME} ──"
HTTP="$(curl -sS -o /tmp/evo-profile-name.json -w '%{http_code}' \
  -X POST "${URL}/chat/updateProfileName/${ENC}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${KEY}" \
  -d "{\"name\":\"${DISPLAY_NAME}\"}")"
echo "   HTTP ${HTTP}"
cat /tmp/evo-profile-name.json; echo

if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ Falló updateProfileName con sesión open (HTTP ${HTTP})." >&2
  exit 1
fi

echo "✅ Nombre «${DISPLAY_NAME}» aplicado en Evolution remoto."
