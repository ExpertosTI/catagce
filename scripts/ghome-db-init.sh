#!/bin/bash
# DB push + seed para GHome en producción (sin pnpm en el host)
set -euo pipefail
cd /opt/ghome 2>/dev/null || { echo "❌ /opt/ghome no existe — clone el repo primero"; exit 1; }

DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No se encontró contenedor ghome_db — ejecute primero: bash scripts/deploy-ghome.sh"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD requerido en .env}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD requerido en .env (mín. 12 caracteres)}"
if [ "$ADMIN_PASSWORD" = "demo1234" ] || [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "❌ ADMIN_PASSWORD débil — use al menos 12 caracteres aleatorios en producción"
  exit 1
fi
export DATABASE_URL="postgres://ghome_admin:${DB_PASSWORD}@127.0.0.1:5432/ghome_prod"

echo "💾 Espacio en disco:"
df -h / | tail -1

AVAIL_KB=$(df / --output=avail | tail -1 | tr -d ' ')
if [ "${AVAIL_KB}" -lt 2097152 ]; then
  echo "⚠️  Poco espacio (<2GB). Limpiando caché Docker..."
  docker system prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter until=48h >/dev/null 2>&1 || true
  df -h / | tail -1
fi

run_db_cmd() {
  docker run --rm --network "container:${DB_CONTAINER}" \
    -v "$(pwd):/app" -w /app \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@generalhome.tech}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    -e NODE_ENV=production \
    -e CI=true \
    node:20-alpine sh -c "
      set -e
      corepack enable
      pnpm install --filter @ghome/db... --frozen-lockfile --ignore-scripts
      $1
    "
}

case "${1:-all}" in
  push)
    echo "🗄️  drizzle-kit push..."
    run_db_cmd "pnpm --filter @ghome/db push --force"
    echo "🩹 Parche SQL de respaldo..."
    bash scripts/ghome-schema-patch.sh
    ;;
  seed)
    echo "🌱 seed..."
    run_db_cmd "pnpm --filter @ghome/db seed"
    ;;
  patch)
    bash scripts/ghome-schema-patch.sh
    ;;
  all)
    echo "🗄️  1/3 Schema (drizzle)..."
    run_db_cmd "pnpm --filter @ghome/db push --force"
    echo "🩹 2/3 Parche SQL..."
    bash scripts/ghome-schema-patch.sh
    echo "🌱 3/3 Seed..."
    run_db_cmd "pnpm --filter @ghome/db seed"
    echo ""
    echo "✅ Listo — admin: ${ADMIN_EMAIL:-admin@generalhome.tech} (contraseña de ADMIN_PASSWORD en .env)"
    echo "   Portal: https://generalhome.tech"
    ;;
  *)
    echo "Uso: $0 [push|seed|patch|all]"
    exit 1
    ;;
esac
