#!/bin/bash
# Recuperar web caída o update pausado — sin editar archivos a mano
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

echo "═══ Estado web ═══"
docker service ls | grep catagce_web || true
docker service ps catagce_web --no-trunc 2>&1 | head -8

echo ""
echo "═══ Logs contenedor fallido ═══"
FAILED=$(docker ps -aq --filter name=catagce_web --filter status=exited 2>/dev/null | head -1)
if [ -n "$FAILED" ]; then
  docker logs "$FAILED" 2>&1 | tail -40
else
  docker service logs catagce_web --tail 40 2>&1 || true
fi

echo ""
echo "═══ Probar imagen local (20s) ═══"
docker rm -f web-recover-test 2>/dev/null || true
docker run -d --name web-recover-test \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  -e PORT=3000 \
  -p 13000:3000 \
  catagce-web:latest

sleep 15
if curl -sf -o /dev/null http://127.0.0.1:13000/login; then
  echo "✓ Imagen web OK en :13000"
else
  echo "✗ Imagen web crashea o no responde:"
  docker logs web-recover-test 2>&1 | tail -25
fi
docker rm -f web-recover-test 2>/dev/null || true

echo ""
echo "═══ Rollback si update pausado ═══"
docker service rollback catagce_web 2>/dev/null || true
sleep 15

echo ""
echo "═══ Redeploy con rollback automático ═══"
docker stack deploy -c docker-compose.yml catagce
docker service update \
  --force \
  --update-failure-action rollback \
  --update-order start-first \
  --limit-memory 768M \
  catagce_web

echo "⏳ Esperando 45s..."
sleep 45

docker service ps catagce_web --no-trunc 2>&1 | head -5
curl -sf -o /dev/null -w "Web /login: %{http_code}\n" https://catagce.renace.tech/login || echo "❌ web sin respuesta"
curl -sf -o /dev/null -w "Web /dashboard/products/new: %{http_code}\n" https://catagce.renace.tech/dashboard/products/new || true
