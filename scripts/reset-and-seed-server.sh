#!/bin/bash
# Ejecuta comandos Node con acceso a Postgres vía red del contenedor DB (Swarm)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No se encontró contenedor catagce_db"
  exit 1
fi

DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)
export DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@127.0.0.1:5432/catagce_prod"

run_node() {
  docker run --rm --network "container:${DB_CONTAINER}" \
    -v "$(pwd):/app" -w /app \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@renace.tech}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-CatagceAdmin2026!}" \
    node:20-alpine sh -c "
      set -e
      npm install -g pnpm >/dev/null 2>&1
      pnpm install --frozen-lockfile 2>/dev/null || pnpm install
      $1
    "
}

case "${1:-all}" in
  push)
    echo "🗄️  drizzle-kit push..."
    run_node "pnpm --filter @catagce/db push --force"
    ;;
  seed)
    echo "🌱 seed..."
    run_node "pnpm --filter @catagce/db seed"
    ;;
  reset)
    echo "🗑️  purga SQL..."
    docker exec -i "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod < scripts/reset-db.sql
    ;;
  all)
    echo "🗑️  1/3 Purga datos antiguos..."
    docker exec -i "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod < scripts/reset-db.sql
    echo "🗄️  2/3 Schema drizzle..."
    run_node "pnpm --filter @catagce/db push --force"
    echo "🌱 3/3 Seed admin..."
    run_node "pnpm --filter @catagce/db seed"
    echo ""
    echo "✅ Listo — login: admin@renace.tech / CatagceAdmin2026!"
    ;;
  *)
    echo "Uso: $0 [reset|push|seed|all]"
    exit 1
    ;;
esac
