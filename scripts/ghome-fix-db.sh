#!/usr/bin/env bash
# Repara conexión API ↔ Postgres en Docker Swarm
set -euo pipefail
cd /opt/ghome 2>/dev/null || { echo "❌ Ejecute desde /opt/ghome"; exit 1; }

# shellcheck disable=SC1091
set -a && source .env && set +a
: "${DB_PASSWORD:?Falta DB_PASSWORD en .env}"

echo "═══ 1. Estado servicios ═══"
docker service ls | grep ghome || true
echo ""

DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
API_CONTAINER=$(docker ps -q -f name=ghome_api.1 | head -1)

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Postgres no está corriendo. Intentando levantar stack..."
  docker stack deploy -c docker-compose.yml ghome
  sleep 20
  DB_CONTAINER=$(docker ps -q -f name=ghome_db.1 | head -1)
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ No se pudo iniciar ghome_db — revise: docker service logs ghome_db --tail 50"
  exit 1
fi

echo "✅ DB container: $DB_CONTAINER"

echo ""
echo "═══ 2. Sincronizar contraseña Postgres con .env ═══"
# Postgres solo aplica POSTGRES_PASSWORD al crear el volumen; si .env cambió, hay que alinear.
docker exec "$DB_CONTAINER" psql -U ghome_admin -d ghome_prod -v ON_ERROR_STOP=1 \
  -c "ALTER USER ghome_admin WITH PASSWORD '${DB_PASSWORD}';" \
  && echo "✅ Contraseña alineada"

echo ""
echo "═══ 3. Probar conexión desde red Docker ═══"
docker run --rm --network RenaceNet \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16-alpine \
  psql -h ghome_db -U ghome_admin -d ghome_prod -c "SELECT 1 AS ok;" \
  && echo "✅ ghome_db resuelve OK" \
  || echo "⚠️  ghome_db falló — probando alias ghome-db..."
docker run --rm --network RenaceNet \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16-alpine \
  psql -h ghome-db -U ghome_admin -d ghome_prod -c "SELECT 1 AS ok;" 2>/dev/null \
  && echo "✅ ghome-db resuelve OK" \
  || true

echo ""
echo "═══ 4. Redeploy API (DB_HOST=ghome_db) ═══"
docker stack deploy -c docker-compose.yml ghome
echo "Esperando 30s..."
sleep 30

echo ""
echo "═══ 5. Health check ═══"
READY=$(curl -s https://api.generalhome.tech/api/health/ready || echo '{}')
echo "$READY"
if echo "$READY" | grep -q '"db":"ok"'; then
  echo "✅ API + DB operativos"
else
  echo "⚠️  DB aún con error. Logs API:"
  docker service logs ghome_api --tail 30 2>&1 || true
  echo ""
  echo "Logs DB:"
  docker service logs ghome_db --tail 20 2>&1 || true
fi
