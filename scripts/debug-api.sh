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
echo "═══ Probar arranque API (10s) ═══"
export $(grep -v '^#' .env | xargs)
docker rm -f api-debug 2>/dev/null || true
docker run -d --name api-debug --network RenaceNet \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@db:5432/catagce_prod" \
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

echo ""
echo "═══ Swarm task error ═══"
docker service ps catagce_api --no-trunc 2>&1 | head -6
