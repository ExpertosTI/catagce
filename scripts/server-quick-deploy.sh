#!/bin/bash
# Despliegue mínimo — copiar/pegar en el servidor si server-deploy.sh no existe aún
set -e
cd /opt/QuickCtgo

echo "📥 Sync código..."
git fetch --all && git reset --hard origin/main

echo "🧹 Limpiar disco..."
docker system prune -af --filter "until=72h" 2>/dev/null || true
docker builder prune -af 2>/dev/null || true

echo "🏗️  Build api + web..."
export $(grep -v '^#' .env | xargs)
if [ -f .evolution.local ]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    [ -z "${!key}" ] && export "$key=$val"
  done < .evolution.local
fi
docker compose build --parallel api web

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar servicios..."
for svc in api web media-processor catalog-renderer notifications; do
  docker service update --force "catagce_${svc}" 2>/dev/null && echo "  ✓ catagce_${svc}" || true
done

echo "🗄️  DB reset + seed admin..."
echo "⚠️  DEPRECADO: no uses este script en producción. Usa: bash scripts/deploy-update.sh"
echo "   Si realmente necesitas reset: bash scripts/reset-and-seed-server.sh all"

sleep 8
curl -sf https://api.catagce.renace.tech/api/health && echo " ✅ API OK" || echo " ⏳ API arrancando..."

echo "✅ Listo — https://catagce.renace.tech"
