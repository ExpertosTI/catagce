#!/usr/bin/env bash
# Deploy rápido GHome: solo reconstruye imágenes que cambiaron (api / portal / admin)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ghome}"
cd "$REPO_DIR"

BRANCH="${GHOME_BRANCH:-ghome}"

echo "═══ GHome deploy rápido ($BRANCH) ═══"

if [ ! -f .env ]; then
  echo "❌ Falta .env en $REPO_DIR"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

BEFORE=$(git rev-parse HEAD)
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || true)
else
  CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
fi

if [ -z "$CHANGED" ]; then
  echo "ℹ️  Sin cambios nuevos en $AFTER"
  exit 0
fi

needs_api=false
needs_portal=false
needs_admin=false
needs_db=false

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    apps/api/*|packages/db/*|docker-compose.yml|apps/api/Dockerfile|pnpm-lock.yaml|package.json)
      needs_api=true ;;
    apps/client-portal/*|apps/client-portal/Dockerfile)
      needs_portal=true ;;
    apps/admin-web/*|apps/admin-web/Dockerfile)
      needs_admin=true ;;
    packages/db/*)
      needs_db=true ;;
  esac
done <<< "$CHANGED"

echo "$CHANGED" | grep -q '^packages/db/' && needs_db=true
echo "$CHANGED" | grep -q '^docker-compose.yml$' && needs_api=true

echo ""
echo "═══ Cambios ═══"
echo "$CHANGED" | head -25
[ "$(echo "$CHANGED" | wc -l)" -gt 25 ] && echo "... y más"
echo ""
echo "Rebuild → API: $needs_api | Portal: $needs_portal | Admin: $needs_admin | DB push: $needs_db"
echo ""

if $needs_api; then
  echo "🚀 Build API..."
  docker build -t ghome-api:latest -f apps/api/Dockerfile .
fi

if $needs_portal; then
  echo "🚀 Build Portal..."
  docker build -t ghome-portal:latest \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.generalhome.tech/api}" \
    --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://generalhome.tech}" \
    --build-arg NEXT_PUBLIC_ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://admin.generalhome.tech}" \
    --build-arg NEXT_PUBLIC_COMPANY_SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-generalhome}" \
    -f apps/client-portal/Dockerfile .
fi

if $needs_admin; then
  echo "🚀 Build Admin..."
  docker build -t ghome-admin:latest \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.generalhome.tech/api}" \
    --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://generalhome.tech}" \
    --build-arg NEXT_PUBLIC_ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://admin.generalhome.tech}" \
    --build-arg NEXT_PUBLIC_COMPANY_SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-generalhome}" \
    -f apps/admin-web/Dockerfile .
fi

if ! $needs_api && ! $needs_portal && ! $needs_admin; then
  echo "✅ Sin cambios en servicios Docker (ej. solo apps/mobile)."
else
  echo "═══ Actualizar stack ═══"
  docker stack deploy -c docker-compose.yml ghome
  echo "Esperando 25s..."
  sleep 25
fi

if $needs_db; then
  echo "🗄️  Schema DB..."
  bash scripts/ghome-db-init.sh push
fi

HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://api.generalhome.tech/api/health 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ API online — https://api.generalhome.tech/api/health"
else
  echo "⚠️  API HTTP $HTTP — docker service logs ghome_api --tail 30"
fi

echo ""
echo "✅ Deploy rápido listo"
echo "   Portal: https://generalhome.tech"
echo "   Admin:  https://admin.generalhome.tech"
