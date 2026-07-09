#!/bin/bash
# Aplica parche broadcast según el schema real de la DB (ghome o main). Idempotente.
set -euo pipefail

if [ -d /opt/QuickCtgo ]; then cd /opt/QuickCtgo
elif [ -d /opt/ghome ]; then cd /opt/ghome
else cd "$(dirname "$0")/.."
fi

DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
DB_USER=catagce_admin
DB_NAME=catagce_prod

if [ -z "$DB_CONTAINER" ]; then
  DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
  DB_USER=ghome_admin
  DB_NAME=ghome_prod
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No se encontró contenedor de base de datos"
  exit 1
fi

if [ -f .env ]; then
  DB_USER=$(grep '^DB_USER=' .env 2>/dev/null | cut -d= -f2- || echo "$DB_USER")
  DB_NAME=$(grep '^DB_NAME=' .env 2>/dev/null | cut -d= -f2- || echo "$DB_NAME")
fi

has_table() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_name='$1' LIMIT 1;" 2>/dev/null | grep -q 1
}

if has_table companies; then
  echo "🩹 Parche broadcast (schema ghome / companies)..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    < scripts/ghome-schema-patch.sql
elif has_table sellers; then
  echo "🩹 Parche broadcast (schema main / sellers)..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    < scripts/quickctgo-broadcast-main.sql
else
  echo "❌ No se reconoce el schema (sin companies ni sellers). Ejecute diagnose-quickctgo.sh"
  exit 1
fi

echo "✅ Parche broadcast aplicado"
