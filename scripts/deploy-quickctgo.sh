#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO_DIR"

echo "═══ CATAGCE (QuickCtgo) — actualización ═══"

if [ ! -f docker-compose.quickctgo.yml ]; then
  echo "❌ Falta docker-compose.quickctgo.yml — use la rama QuickCtgo"
  exit 1
fi

# shellcheck disable=SC1091
source scripts/quickctgo-env.sh
quickctgo_load_env

if [ -z "${JWT_SECRET:-}" ]; then
  echo "❌ JWT_SECRET vacío en .env — no se genera automáticamente para no romper sesiones."
  exit 1
fi

if quickctgo_whatsapp_ready; then
  echo "✓ WhatsApp listo para envíos"
else
  echo "ℹ️  WhatsApp: agregue credenciales en .evolution.local o en .env (sin tocar el resto)"
fi

API_URL="${NEXT_PUBLIC_API_URL:-https://api.catagce.renace.tech/api}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://catagce.renace.tech}"
ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://catagce.renace.tech}"
SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-catagce}"
APP_NAME="${NEXT_PUBLIC_APP_NAME:-CATAGCE}"

echo "═══ Build imágenes ═══"
docker build -t catagce-api:latest -f apps/api/Dockerfile .
docker build -t catagce-admin:latest \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_SITE_URL="${SITE_URL}" \
  --build-arg NEXT_PUBLIC_ADMIN_URL="${ADMIN_URL}" \
  --build-arg NEXT_PUBLIC_COMPANY_SLUG="${SLUG}" \
  --build-arg NEXT_PUBLIC_APP_NAME="${APP_NAME}" \
  -f apps/admin-web/Dockerfile .

echo "═══ Deploy stack (solo añade/actualiza servicios del compose) ═══"
docker stack deploy -c docker-compose.quickctgo.yml catagce

for svc in catagce_admin catagce_api; do
  if docker service inspect "$svc" >/dev/null 2>&1; then
    docker service update --force "$svc" 2>/dev/null && echo "  ✓ $svc" || true
  fi
done

echo "═══ Esperando API (~40s) ═══"
sleep 40

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL%/}/health" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ API online"
else
  echo "⚠️  API HTTP $HTTP — docker service logs catagce_api --tail 30"
fi

echo ""
echo "Schema (solo tablas nuevas, no borra datos):"
echo "  bash scripts/quickctgo-db-init.sh"
echo ""
echo "Panel:    ${ADMIN_URL}/login"
echo "Difusión: ${ADMIN_URL}/dashboard/broadcast"
