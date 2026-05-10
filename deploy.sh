#!/bin/bash

# ==============================================================================
# 🚀 CATAGCE DEPLOYMENT PROTOCOL (RENACE VPS) - STAGE 4
# ==============================================================================

PROJECT_DIR="/opt/QuickCtgo"
REPO_URL="https://github.com/ExpertosTI/catagce"

echo "-----------------------------------"
echo "🛰️  Starting Renace Protocol..."
echo "-----------------------------------"

# 1. Sync Code
cd $PROJECT_DIR
echo "📥 Syncing code from Git..."
git fetch origin main
git reset --hard origin/main

# 2. Setup Secrets
echo "🔐 Configuring environment..."
if [ ! -f .env ]; then
    cat <<EOF > .env
DATABASE_URL=postgres://catagce_admin:${DB_PASSWORD:-$(openssl rand -base64 24)}@db:5432/catagce_prod
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 24)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
REDIS_HOST=redis
REDIS_PORT=6379
EOF
fi

# 3. Build & Deploy (The Renace Way)
echo "🏗️  Building images locally..."
export $(grep -v '^#' .env | xargs)
docker compose build --parallel

echo "🚢 Deploying Stack (using resolved config)..."
# CRITICAL: Using <(docker compose config) to resolve variables and paths for Swarm
docker stack deploy -c <(docker compose config) catagce

# 4. Service Hardening
echo "🔄 Forcing updates to ensure service health..."
docker service update --force catagce_api
docker service update --force catagce_web
docker service update --force catagce_media-processor
docker service update --force catagce_catalog-renderer
docker service update --force catagce_notifications

echo "-----------------------------------"
echo "✅ RENACE PROTOCOL EXECUTED"
echo "-----------------------------------"
