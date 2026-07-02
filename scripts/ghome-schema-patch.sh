#!/bin/bash
# Aplica parche SQL idempotente al esquema GHome en producción
set -euo pipefail
cd /opt/ghome 2>/dev/null || { echo "❌ /opt/ghome no existe"; exit 1; }

DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No se encontró contenedor ghome_db"
  exit 1
fi

echo "🩹 Aplicando parche de esquema GHome..."
docker exec -i "$DB_CONTAINER" psql -U ghome_admin -d ghome_prod -v ON_ERROR_STOP=1 \
  < scripts/ghome-schema-patch.sql

echo "✅ Parche aplicado"
echo ""
echo "Verificación columnas clients:"
docker exec "$DB_CONTAINER" psql -U ghome_admin -d ghome_prod -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name IN ('auth_provider','provider_subject');"
