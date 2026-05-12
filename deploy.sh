#!/bin/bash
set -e

# Configuración del Proyecto
PROJECT_DIR="/opt/QuickCtgo"
STACK_NAME="catagce"
MAIN_SERVICE="${STACK_NAME}_api"

echo "🛰️  Sincronizando código desde GitHub..."
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git fetch origin deploy/stable-production
    git reset --hard origin/deploy/stable-production
else
    echo "❌ Error: El directorio $PROJECT_DIR no existe."
    exit 1
fi

# Cargar variables de entorno
if [ -f ".env" ]; then
    set -a; source .env; set +a
else
    echo "❌ Error: Archivo .env no encontrado."
    exit 1
fi

echo "🐳 Construyendo imágenes Docker (Zero-CPU Mode)..."
docker compose build --pull api web catalog-renderer notifications media-processor

echo "🚢 Desplegando Stack '$STACK_NAME' en Docker Swarm..."
COMPOSE_TMP=$(mktemp /tmp/catagce-stack-XXXXXX.yml)
sed '/^name:/d' docker-compose.yml > "$COMPOSE_TMP"
docker stack deploy -c "$COMPOSE_TMP" "$STACK_NAME"
rm "$COMPOSE_TMP"

echo "🔄 Forzando actualización de servicios críticos..."
docker service update --force "${STACK_NAME}_api"
docker service update --force "${STACK_NAME}_web"

echo "🧹 Limpieza de imágenes antiguas..."
docker image prune -f

echo "✅ Despliegue completado con éxito."
