#!/bin/bash
# Diagnóstico rápido: por qué crashea catagce-api
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

echo "═══ Imagen local ═══"
docker image inspect catagce-api:latest --format '{{.Id}} {{.Created}}' 2>/dev/null || echo "Sin imagen catagce-api:latest"

echo ""
echo "═══ ¿Existe dist/main.js en la imagen? ═══"
docker run --rm catagce-api:latest ls -la dist/ 2>&1 || true

echo ""
echo "═══ ¿Arranca @catagce/db? ═══"
docker run --rm catagce-api:latest node -e "require('@catagce/db'); console.log('db ok')" 2>&1 || true

echo ""
echo "═══ Probar arranque API (módulos, sin red) ═══"
docker run --rm catagce-api:latest node -e "require('@catagce/db'); console.log('modules ok')" 2>&1 || true

echo ""
echo "═══ Probar arranque API con DB (network container) ═══"
export $(grep -v '^#' .env | xargs)
DB_TASK=$(docker ps -q -f name=catagce_db | head -1)
if [ -z "$DB_TASK" ]; then
  echo "⚠️  No hay contenedor catagce_db corriendo — omitiendo prueba con red"
else
  docker rm -f api-debug 2>/dev/null || true
  docker run -d --name api-debug --network "container:${DB_TASK}" \
    -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@127.0.0.1:5432/catagce_prod" \
    -e REDIS_HOST=redis -e REDIS_PORT=6379 -e JWT_SECRET="${JWT_SECRET}" \
    catagce-api:latest
  sleep 8
  if docker ps --filter name=api-debug --format '{{.Names}}' | grep -q api-debug; then
    echo "✓ Contenedor vivo"
    docker logs api-debug --tail 15
  else
    echo "✗ Contenedor murió — logs:"
    docker logs api-debug 2>&1 || true
  fi
  docker rm -f api-debug 2>/dev/null || true
fi

echo ""
echo "═══ Swarm task error ═══"
docker service ps catagce_api --no-trunc 2>&1 | head -6
