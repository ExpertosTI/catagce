#!/bin/bash
# Recuperar API caída (0/1) — ver error y reiniciar con rollback
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

echo "═══ Estado API ═══"
docker service ls | grep catagce_api || true
docker service ps catagce_api --no-trunc 2>&1 | head -8

echo ""
echo "═══ Contenedor fallido (logs) ═══"
FAILED=$(docker ps -aq --filter name=catagce_api --filter status=exited 2>/dev/null | head -1)
if [ -n "$FAILED" ]; then
  docker logs "$FAILED" 2>&1 | tail -40
else
  echo "(sin contenedor exited — ver service logs abajo)"
  docker service logs catagce_api --tail 40 2>&1 || true
fi

echo ""
echo "═══ Probar imagen local (15s) ═══"
export $(grep -v '^#' .env | xargs)
docker rm -f api-recover-test 2>/dev/null || true
docker run -d --name api-recover-test \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@host.docker.internal:5432/catagce_prod" \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET="${JWT_SECRET}" \
  --add-host=host.docker.internal:host-gateway \
  catagce-api:latest 2>/dev/null || \
docker run -d --name api-recover-test \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@172.17.0.1:5432/catagce_prod" \
  -e REDIS_HOST=172.17.0.1 \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET="${JWT_SECRET}" \
  catagce-api:latest

sleep 12
if docker ps --filter name=api-recover-test --format '{{.Names}}' | grep -q api-recover-test; then
  echo "✓ Imagen arranca localmente"
  docker logs api-recover-test --tail 10
else
  echo "✗ Imagen crashea — logs:"
  docker logs api-recover-test 2>&1 | tail -25
fi
docker rm -f api-recover-test 2>/dev/null || true

echo ""
echo "═══ Redeploy con rollback ═══"
docker stack deploy -c docker-compose.yml catagce
docker service update --force \
  --update-failure-action rollback \
  --update-order start-first \
  catagce_api

echo "⏳ Esperando 60s..."
sleep 60

docker service ps catagce_api --no-trunc 2>&1 | head -5
curl -sf https://api.catagce.renace.tech/api/health && echo "" || echo "❌ API sin respuesta"
curl -sf https://api.catagce.renace.tech/api/health/ready && echo "" || echo "⚠️  DB no lista (ver /api/health/ready)"
