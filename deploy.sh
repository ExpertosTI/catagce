#!/bin/bash

# ==============================================================================
# 🚀 CATAGCE DEPLOYMENT PROTOCOL (RENACE VPS)
# ==============================================================================

PROJECT_DIR="/opt/QuickCtgo"
REPO_URL="https://github.com/ExpertosTI/catagce"

echo "-----------------------------------"
echo "🛰️  Starting Deployment Protocol..."
echo "-----------------------------------"

# 1. Sync Code from Git
echo "📥 Syncing code from repository..."
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo "⚠️  Cloning repository for the first time..."
    git clone $REPO_URL $PROJECT_DIR
fi

cd $PROJECT_DIR
git fetch origin main
git reset --hard origin/main

# 2. Setup Secrets (.env)
echo "🔐 Configuring environment secrets..."
# Generamos el .env si no existe, o lo actualizamos
if [ ! -f .env ]; then
    cat <<EOF > .env
DATABASE_URL=postgres://catagce_admin:${DB_PASSWORD:-$(openssl rand -base64 24)}@db:5432/catagce_prod
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 24)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
REDIS_HOST=redis
REDIS_PORT=6379
EOF
    echo "✅ Secrets generated."
else
    echo "✅ Using existing .env file."
fi

# 3. Build Images Locally (Renace Monorepo Protocol)
# Swarm no tiene registry, así que construimos en el nodo
echo "🏗️  Building Docker images (Local Node)..."
export $(grep -v '^#' .env | xargs)
docker compose build --parallel

# 4. Deploy to Docker Swarm
echo "🚢 Deploying to Docker Swarm (catagce)..."
docker stack deploy -c docker-compose.yml --with-registry-auth catagce

# 5. Health Check & Force Update
echo "🔄 Forcing service updates to ensure latest code..."
docker service update --force catagce_api
docker service update --force catagce_web
docker service update --force catagce_media-processor
docker service update --force catagce_catalog-renderer
docker service update --force catagce_notifications

echo "-----------------------------------"
echo "✅ DEPLOYMENT COMPLETE"
echo "-----------------------------------"
