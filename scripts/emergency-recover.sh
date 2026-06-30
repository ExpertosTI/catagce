#!/bin/bash
# Recuperación cuando disco lleno → API/web no arrancan (logs vacíos, 404)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

echo "═══════════════════════════════════════"
echo "  EMERGENCIA — disco + arranque Catagce"
echo "═══════════════════════════════════════"

echo ""
echo "💾 ANTES:"
df -h / | tail -1

echo ""
echo "🧹 1. Limpiar Docker (imágenes, cache, contenedores parados)..."
docker container prune -f 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
docker system prune -af 2>/dev/null || true

echo ""
echo "🧹 2. Limpiar artefactos locales del repo..."
rm -rf .pnpm-store node_modules apps/*/.next apps/*/node_modules packages/*/node_modules 2>/dev/null || true

echo ""
echo "🧹 3. Logs del sistema (3 días)..."
journalctl --vacuum-time=3d 2>/dev/null || true

echo ""
echo "💾 DESPUÉS:"
df -h / | tail -1
FREE_MB=$(df / | tail -1 | awk '{print $4}' | sed 's/[^0-9]//g')
if [ -z "$FREE_MB" ] || [ "$FREE_MB" -lt 2000 ]; then
  echo ""
  echo "❌ Aún queda poco espacio (< 2GB libre)."
  echo "   Revisa manualmente: du -sh /var/lib/docker/* | sort -hr | head -10"
  echo "   NO ejecutes más builds hasta liberar espacio."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

echo ""
echo "🔬 4. Probar imagen API localmente..."
docker rm -f catagce-api-test 2>/dev/null || true
if docker run -d --rm --name catagce-api-test --network RenaceNet \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@db:5432/catagce_prod" \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET="${JWT_SECRET}" \
  catagce-api:latest; then
  sleep 6
  if docker ps --filter name=catagce-api-test --format '{{.Names}}' | grep -q catagce-api-test; then
    echo "   ✓ API arrancó — últimas líneas de log:"
    docker logs catagce-api-test --tail 5 2>&1 || true
    docker rm -f catagce-api-test 2>/dev/null || true
  else
    echo "   ❌ API crasheó — logs:"
    docker logs catagce-api-test 2>&1 || true
    docker rm -f catagce-api-test 2>/dev/null || true
  fi
else
  echo "   ❌ No se pudo crear contenedor de prueba (¿disco lleno?)"
fi

echo ""
echo "🚢 5. Deploy stack (sin rebuild)..."
docker stack deploy -c docker-compose.yml catagce

echo ""
echo "🔄 6. Reiniciar api + web..."
docker service update --force catagce_api
docker service update --force catagce_web

echo ""
echo "⏳ Esperando 45s..."
sleep 45

echo ""
bash scripts/diagnose-server.sh

echo ""
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://api.catagce.renace.tech/api/health 2>/dev/null || echo "000")
echo "API health HTTP: $HTTP"
if [ "$HTTP" = "200" ]; then
  echo "✅ API online — prueba login en https://catagce.renace.tech/login"
else
  echo "⚠️  API aún no responde. Logs:"
  docker service logs catagce_api --tail 20 2>&1 || true
  docker service ps catagce_api --no-trunc 2>&1 | head -5
fi
