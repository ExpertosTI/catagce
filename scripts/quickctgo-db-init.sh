#!/bin/bash
# Migración de schema para QuickCtgo — no borra datos ni re-seedea por defecto.
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/quickctgo-env.sh
quickctgo_load_env

DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No hay contenedor catagce_db — ejecute primero: bash scripts/deploy-quickctgo.sh"
  exit 1
fi

DB_USER="${DB_USER:-catagce_admin}"
DB_NAME="${DB_NAME:-catagce_prod}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD requerido en .env}"
export DATABASE_URL="${DATABASE_URL:-postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}}"

run_db_cmd() {
  docker run --rm --network "container:${DB_CONTAINER}" \
    -v "$(pwd):/app" -w /app \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e ADMIN_EMAIL="${ADMIN_EMAIL:-}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
    -e NODE_ENV=production \
    -e CI=true \
    node:20-alpine sh -c "
      set -e
      corepack enable
      pnpm install --filter @ghome/db... --frozen-lockfile --ignore-scripts
      $1
    "
}

db_has_staff() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_name='staff_users' LIMIT 1" 2>/dev/null | grep -q 1
}

staff_count() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)::int FROM staff_users" 2>/dev/null || echo "0"
}

do_push() {
  echo "🩹 Parche SQL idempotente (solo tablas broadcast + columnas seguras)..."
  bash scripts/quickctgo-schema-patch.sh || {
    echo ""
    echo "⚠️  El parche SQL falló — probablemente el schema de la DB no coincide con ghome."
    echo "   NO ejecute drizzle push en producción sin revisar diagnose-quickctgo.sh"
    return 1
  }

  if [ "${QUICKCTGO_DRIZZLE_PUSH:-}" != "1" ]; then
    echo ""
    echo "ℹ️  drizzle push OMITIDO (producción)."
    echo "   Solo se aplicó el parche SQL. Para forzar drizzle (peligroso):"
    echo "   QUICKCTGO_DRIZZLE_PUSH=1 bash scripts/quickctgo-db-init.sh push"
    return 0
  fi

  echo "🗄️  drizzle push (forzado con QUICKCTGO_DRIZZLE_PUSH=1)..."
  run_db_cmd "pnpm --filter @ghome/db push --force" || {
    echo "❌ drizzle push falló — revise logs arriba. La DB en línea no fue borrada."
    return 1
  }
}

do_seed() {
  if [ -z "${ADMIN_PASSWORD:-}" ] || [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
    echo "❌ Seed requiere ADMIN_PASSWORD en .env (mín. 12 caracteres)"
    exit 1
  fi
  echo "🌱 Seed..."
  run_db_cmd "pnpm --filter @ghome/db seed"
}

case "${1:-push}" in
  push)
    do_push
    echo "✅ Schema actualizado (datos existentes intactos)"
    ;;
  seed)
    do_seed
    ;;
  patch)
    bash scripts/quickctgo-schema-patch.sh
    ;;
  all)
    do_push
    if db_has_staff && [ "$(staff_count)" -gt 0 ] 2>/dev/null; then
      echo "ℹ️  Seed omitido — ya hay usuarios en la base."
      echo "   Forzar: ADMIN_PASSWORD=... $0 seed"
    else
      do_seed
    fi
    echo "✅ Listo"
    ;;
  *)
    echo "Uso: $0 [push|seed|patch|all]"
    echo "  push  — parche SQL seguro (predeterminado); drizzle solo con QUICKCTGO_DRIZZLE_PUSH=1"
    echo "  patch — solo parche SQL"
    echo "  all   — push + seed solo si la DB está vacía"
    exit 1
    ;;
esac
