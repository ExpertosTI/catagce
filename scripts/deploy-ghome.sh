#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO_DIR"

echo "═══ GHome deploy → generalhome.tech ═══"

if [ ! -f docker-compose.yml ]; then
  echo "❌ No está en el directorio del proyecto."
  echo "   Clone primero:"
  echo "   git clone https://github.com/ExpertosTI/catagce.git /opt/ghome"
  echo "   cd /opt/ghome && git checkout ghome"
  exit 1
fi

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "⚠️  Creado .env — edite DB_PASSWORD y JWT_SECRET:"
    echo "   nano .env"
  else
    echo "❌ Falta .env.example — ¿hizo git pull de la rama ghome?"
    exit 1
  fi
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

if [ -z "${DB_PASSWORD:-}" ] || [ "$DB_PASSWORD" = "change_this_in_production" ]; then
  echo "⚠️  Configure DB_PASSWORD en .env antes de producción"
fi

echo "═══ Build imágenes (puede tardar varios minutos) ═══"
docker build -t ghome-api:latest -f apps/api/Dockerfile .
docker build -t ghome-portal:latest \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.generalhome.tech/api}" \
  --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://generalhome.tech}" \
  --build-arg NEXT_PUBLIC_ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://admin.generalhome.tech}" \
  --build-arg NEXT_PUBLIC_COMPANY_SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-generalhome}" \
  -f apps/client-portal/Dockerfile .
docker build -t ghome-admin:latest \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.generalhome.tech/api}" \
  --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://generalhome.tech}" \
  --build-arg NEXT_PUBLIC_ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://admin.generalhome.tech}" \
  --build-arg NEXT_PUBLIC_COMPANY_SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-generalhome}" \
  -f apps/admin-web/Dockerfile .

echo "═══ Deploy stack Docker Swarm ═══"
docker stack deploy -c docker-compose.yml ghome

echo "═══ Forzar actualización de contenedores (nueva imagen) ═══"
docker service update --force ghome_admin
docker service update --force ghome_api
docker service update --force ghome_portal

echo "═══ Esperando servicios (~45s) ═══"
sleep 45

echo "═══ Health check ═══"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://api.generalhome.tech/api/health 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ API online"
else
  echo "⚠️  API HTTP $HTTP — espere 1-2 min o revise: docker service logs ghome_api --tail 30"
fi

echo ""
echo "═══ Siguiente paso (primera vez) ═══"
echo "  bash scripts/ghome-db-init.sh all"
echo ""
echo "URLs:"
echo "  Portal:  https://generalhome.tech"
echo "  Admin:   https://admin.generalhome.tech"
echo "  API:     https://api.generalhome.tech/api"
