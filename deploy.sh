#!/bin/bash

# ==============================================================================
# 🚀 CATAGCE DEPLOYMENT PROTOCOL (RENACE VPS) - DIAGNOSTIC MODE
# ==============================================================================

PROJECT_DIR=""
for dir in /opt/catagce /opt/QuickCtgo; do
  if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
    PROJECT_DIR="$dir"
    break
  fi
done

if [ -z "$PROJECT_DIR" ]; then
  echo "❌ No se encontró catagce en /opt/catagce ni /opt/QuickCtgo"
  exit 1
fi

REPO_URL="https://github.com/ExpertosTI/catagce"

echo "-----------------------------------"
echo "🛰️  Starting Renace Protocol..."
echo "-----------------------------------"

# 1. Sync & Diagnostic
cd $PROJECT_DIR
echo "📥 Syncing code from Git..."
git fetch --all
git reset --hard origin/main

echo "🔍 DIAGNOSTIC: Checking Dockerfile sizes on VPS..."
ls -l apps/api/Dockerfile apps/buyer-web/Dockerfile workers/*/Dockerfile

# 2. Setup Secrets
echo "🔐 Configuring environment..."
if [ ! -f .env ]; then
    cat <<EOF > .env
DATABASE_URL=postgres://catagce_admin:${DB_PASSWORD:-$(openssl rand -base64 24)}@db:5432/catagce_prod
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 24)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
REDIS_HOST=redis
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=https://api.catagce.renace.tech/api
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:-}
EOF
fi

# 3. Build & Deploy
echo "🏗️  Building images locally..."
export $(grep -v '^#' .env | xargs)
docker compose build --parallel

echo "🚢 Deploying Stack..."
docker stack deploy -c <(docker compose config) catagce

# 4. Service Hardening
echo "🔄 Forcing updates..."
docker service update --force catagce_api
docker service update --force catagce_web
docker service update --force catagce_media-processor
docker service update --force catagce_catalog-renderer
docker service update --force catagce_notifications

echo "-----------------------------------"
echo "✅ RENACE PROTOCOL EXECUTED"
echo "-----------------------------------"
