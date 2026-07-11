#!/usr/bin/env bash
# Repara sesión corporativa WhatsApp (RENACE.TECH) en evoapi remoto.
# Evidencia 2026-07-11: API Catagce → ready=false, state=connecting, instance=RENACE.TECH
# Causa: script previo hizo PUT restart (404) + GET connect sin escanear QR → quedó connecting.
#
# Flujo:
#   1) Diagnóstico Catagce + evoapi
#   2) Si close → POST /instance/restart (método correcto; PUT da 404)
#   3) Si sigue sin open → GET /instance/connect UNA vez, guardar QR, esperar escaneo
#   4) Si open → updateProfileName RENACE.TECH
#   5) Verificar /api/auth/whatsapp/status → ready=true
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

INSTANCE="RENACE.TECH"
DISPLAY_NAME="RENACE.TECH"
CATAGCE_STATUS_URL="https://api.catagce.renace.tech/api/auth/whatsapp/status"
QR_FILE="/tmp/${INSTANCE}-qr.png"
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
case "$URL" in
  *evoapi.renace.tech*) ;;
  *)
    echo "❌ URL debe ser evoapi.renace.tech, got: ${URL}" >&2
    exit 1
    ;;
esac

ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${INSTANCE}'''))")"

catagce_status() {
  curl -sS -m 15 "${CATAGCE_STATUS_URL}" 2>/dev/null || echo '{}'
}

state_of() {
  curl -sS -m 15 "${URL}/instance/connectionState/${ENC}" -H "apikey: ${KEY}" \
    | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print((d.get('instance') or {}).get('state') or d.get('state') or '')
except Exception:
 print('')" 2>/dev/null || true
}

norm() { echo "$1" | tr '[:upper:]' '[:lower:]'; }

save_qr_from_json() {
  local json_file="$1"
  python3 - "$json_file" "$QR_FILE" <<'PY'
import json, sys, base64, re
path, out = sys.argv[1], sys.argv[2]
raw = open(path).read()
try:
    d = json.loads(raw)
except Exception:
    print("no-json"); sys.exit(0)
b64 = None
for key in ("base64", "qrcode"):
    v = d.get(key)
    if isinstance(v, str) and v:
        b64 = v
        break
    if isinstance(v, dict):
        b64 = v.get("base64") or v.get("code")
        if b64:
            break
if not b64:
    # nested
    q = d.get("qrcode") or {}
    if isinstance(q, dict):
        b64 = q.get("base64") or q.get("code")
if not b64:
    print("no-qr")
    sys.exit(0)
b64 = re.sub(r"^data:image/[^;]+;base64,", "", b64)
open(out, "wb").write(base64.b64decode(b64))
print(out)
PY
}

echo "════════════════════════════════════════"
echo "1) Diagnóstico Catagce (público)"
echo "════════════════════════════════════════"
CAT_JSON="$(catagce_status)"
echo "   ${CAT_JSON}"
echo
echo "════════════════════════════════════════"
echo "2) Diagnóstico evoapi ${URL} / ${INSTANCE}"
echo "════════════════════════════════════════"
STATE="$(state_of)"
echo "   connectionState=${STATE:-desconocido}"

if [ "$(norm "$STATE")" = "open" ]; then
  echo "   ✅ Ya está open — no hace falta QR."
else
  # close: intentar restart (restaura sesión guardada sin QR si aún existe)
  if [ "$(norm "$STATE")" = "close" ] || [ -z "$STATE" ]; then
    echo
    echo "── POST /instance/restart/${INSTANCE} ──"
    HTTP_R="$(curl -sS -m 30 -o /tmp/evo-restart.json -w '%{http_code}' \
      -X POST "${URL}/instance/restart/${ENC}" \
      -H "apikey: ${KEY}")"
    echo "   HTTP ${HTTP_R} $(head -c 200 /tmp/evo-restart.json 2>/dev/null || true)"
    for i in 1 2 3 4 5 6 7 8; do
      sleep 3
      STATE="$(state_of)"
      echo "   poll restart ${i}: ${STATE:-…}"
      [ "$(norm "$STATE")" = "open" ] && break
    done
  fi

  STATE="$(state_of)"
  if [ "$(norm "$STATE")" != "open" ]; then
    echo
    echo "── GET /instance/connect/${INSTANCE} (UNA vez → QR para escanear) ──"
    HTTP_C="$(curl -sS -m 30 -o /tmp/evo-connect.json -w '%{http_code}' \
      "${URL}/instance/connect/${ENC}" \
      -H "apikey: ${KEY}")"
    echo "   HTTP ${HTTP_C}"
    head -c 220 /tmp/evo-connect.json; echo
    SAVED="$(save_qr_from_json /tmp/evo-connect.json || true)"
    if [ -n "$SAVED" ] && [ "$SAVED" != "no-qr" ] && [ "$SAVED" != "no-json" ]; then
      echo "   QR guardado: ${SAVED}"
      echo "   → Escanea con el WhatsApp del +1 849 568-4958 (Dispositivos vinculados)."
    else
      echo "   Sin base64 en respuesta — abre Manager:"
    fi
    echo "   → https://evoapi.renace.tech/manager → instancia ${INSTANCE} → Connect"
    echo
    echo "── Esperando state=open (hasta ~2 min) ──"
    for i in $(seq 1 24); do
      sleep 5
      STATE="$(state_of)"
      echo "   poll connect ${i}: ${STATE:-…}"
      [ "$(norm "$STATE")" = "open" ] && break
    done
  fi
fi

STATE="$(state_of)"
if [ "$(norm "$STATE")" != "open" ]; then
  echo
  echo "❌ Sigue state=${STATE:-unknown}. Login WA seguirá «no disponible» hasta Connected." >&2
  echo "   Acción humana: Manager evoapi → ${INSTANCE} → escanear QR." >&2
  echo "   Luego re-ejecuta: bash scripts/repair-corporate-wa-session.sh" >&2
  exit 1
fi

echo
echo "════════════════════════════════════════"
echo "3) updateProfileName → ${DISPLAY_NAME}"
echo "════════════════════════════════════════"
HTTP="$(curl -sS -m 30 -o /tmp/evo-profile-name.json -w '%{http_code}' \
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

echo
echo "════════════════════════════════════════"
echo "4) Verificación Catagce"
echo "════════════════════════════════════════"
sleep 2
FINAL="$(catagce_status)"
echo "   ${FINAL}"
READY="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print('1' if d.get('ready') else '0')" "$FINAL" 2>/dev/null || echo 0)"
if [ "$READY" = "1" ]; then
  echo "✅ Listo: login WhatsApp debe estar disponible (ready=true)."
  exit 0
fi
echo "⚠️  evoapi open pero Catagce aún ready≠true. Revisa EVOLUTION_INSTANCE en Swarm." >&2
echo "   bash scripts/sync-evolution-env.sh" >&2
exit 1
