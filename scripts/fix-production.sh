#!/bin/bash
# Recuperar servicios api/web tras deploy fallido
set -e
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🏗️  Rebuild api + web..."
export $(grep -v '^#' .env | xargs)
docker compose build --no-cache api web

echo "🚢 Deploy stack..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Force update api + web..."
docker service update --force catagce_api
docker service update --force catagce_web

echo "⏳ Esperando arranque..."
sleep 25

echo "🗄️  DB schema + seed..."
bash scripts/reset-and-seed-server.sh all || bash scripts/reset-and-seed-server.sh push && bash scripts/reset-and-seed-server.sh seed

docker service update --force catagce_api

sleep 15
bash scripts/diagnose-server.sh
