#!/bin/bash
# Aplica parche SQL idempotente (GHome o QuickCtgo/CATAGCE)
set -euo pipefail

if [ -d /opt/QuickCtgo ]; then
  cd /opt/QuickCtgo
elif [ -d /opt/ghome ]; then
  cd /opt/ghome
else
  cd "$(dirname "$0")/.."
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
  echo "❌ No se encontró contenedor catagce_db ni ghome_db"
  exit 1
fi

echo "🩹 Aplicando parche de esquema (${DB_NAME})..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  < scripts/ghome-schema-patch.sql

echo "✅ Parche aplicado"
