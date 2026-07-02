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
export DATABASE_URL="postgres://ghome_admin:${DB_PASSWORD}@127.0.0.1:5432/ghome_prod"

run_node() {
  docker run --rm --network "container:${DB_CONTAINER}" \
    -v "$(pwd):/app" -w /app \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@generalhome.tech}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-demo1234}" \
    node:20-alpine sh -c "
      set -e
      npm install -g pnpm >/dev/null 2>&1
      pnpm install --no-frozen-lockfile 2>/dev/null || pnpm install
      $1
    "
}

case "${1:-all}" in
  push)
    echo "🗄️  drizzle-kit push..."
    run_node "pnpm --filter @ghome/db push --force"
    ;;
  seed)
    echo "🌱 seed..."
    run_node "pnpm --filter @ghome/db seed"
    ;;
  all)
    echo "🗄️  1/2 Schema..."
    run_node "pnpm --filter @ghome/db push --force"
    echo "🌱 2/2 Seed..."
    run_node "pnpm --filter @ghome/db seed"
    echo ""
    echo "✅ Listo — admin: admin@generalhome.tech / demo1234"
    echo "   Portal: https://generalhome.tech"
    ;;
  *)
    echo "Uso: $0 [push|seed|all]"
    exit 1
    ;;
esac
