#!/usr/bin/env bash
# Fija el nombre de perfil WhatsApp de la instancia corporativa
# para que en el chat se vea "RENACE.TECH" y no +1 (849) 568-4958.
# Evidencia: Evolution Manager Connected = RENACE.TECH / 18495684958
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

echo "── updateProfileName ──"
echo "   instance=${INSTANCE}"
echo "   name=${DISPLAY_NAME}"
echo "   url=${URL}"

enc_instance="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"
code="$(curl -sS -o /tmp/evo-profile-name.json -w '%{http_code}' \
  -X POST "${URL}/chat/updateProfileName/${enc_instance}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${KEY}" \
  -d "{\"name\":\"${DISPLAY_NAME}\"}")"

echo "   HTTP ${code}"
head -c 400 /tmp/evo-profile-name.json 2>/dev/null; echo

if [ "$code" != "200" ] && [ "$code" != "201" ]; then
  echo "❌ Evolution no actualizó el nombre (HTTP ${code})" >&2
  exit 1
fi

echo "✅ Perfil pedido como «${DISPLAY_NAME}»."
echo "   Nota: si el destinatario ya tiene el contacto guardado como número, WhatsApp puede seguir mostrando el número hasta que lo renombre o abra un chat nuevo."
