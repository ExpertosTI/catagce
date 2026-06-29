#!/bin/bash
# Recuperación producción — sin rebuild si las imágenes ya están OK
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🚢 Actualizar stack (healthchecks corregidos)..."
docker stack deploy -c docker-compose.yml catagce

echo "🗄️  Reset DB + schema + seed..."
bash scripts/reset-and-seed-server.sh all

echo "🔄 Reiniciar api + web..."
docker service update --force catagce_api
docker service update --force catagce_web

echo "⏳ Esperando..."
sleep 30
bash scripts/diagnose-server.sh
