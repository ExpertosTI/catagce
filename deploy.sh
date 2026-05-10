#!/bin/bash
set -e

echo "🛰️  CATAGCE DEPLOYMENT PROTOCOL (VPS)"
echo "-----------------------------------"

REPO_URL="https://github.com/ExpertosTI/catagce"
PROJECT_DIR="/opt/QuickCtgo"
git fetch origin main
git reset --hard origin/main

# 2. Configurar entorno si no existe
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado. Generando claves de seguridad..."
    DB_PASS=$(openssl rand -base64 24)
    JWT_SEC=$(openssl rand -base64 32)
    cat <<EOF > .env
DATABASE_URL=postgres://catagce_admin:${DB_PASS}@db:5432/catagce_prod
DB_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SEC}
REDIS_HOST=redis
REDIS_PORT=6379
NODE_ENV=production
EOF
    chmod 600 .env
    echo "✅ .env creado con claves seguras."
fi

# 3. Construir y Desplegar
echo "🏗️  Construyendo imágenes de Docker..."
docker compose build

# 4. Desplegar en Docker Swarm
echo "🚢 Desplegando en Docker Swarm..."
set -a; source .env; set +a
docker stack deploy -c docker-compose.yml catagce

# 5. Reiniciar servicios para aplicar cambios (Swarm Update Force)
echo "♻️  Reiniciando servicios para aplicar cambios..."
docker service update --force catagce_buyer-web
docker service update --force catagce_api
docker service update --force catagce_catalog-renderer
docker service update --force catagce_media-processor
docker service update --force catagce_notifications

# 6. Limpieza
docker image prune -f

echo "✅ DESPLIEGUE COMPLETADO EXITOSAMENTE."
