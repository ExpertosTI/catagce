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

# Cargar y Auto-configurar variables de entorno
if [ -f ".env" ]; then
    # Asegurar que JWT_SECRET tenga al menos 32 caracteres
    CURRENT_JWT=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$CURRENT_JWT" ] || [ ${#CURRENT_JWT} -lt 32 ]; then
        echo "🛡️  Auto-generando JWT_SECRET seguro (mín. 32 chars)..."
        sed -i '/^JWT_SECRET=/d' .env
        echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
    fi

    # Asegurar que BOOTSTRAP_ADMIN_EMAIL esté configurado
    if ! grep -q "^BOOTSTRAP_ADMIN_EMAIL=." .env; then
        echo "👤 Configurando BOOTSTRAP_ADMIN_EMAIL (Super Admin)..."
        sed -i '/^BOOTSTRAP_ADMIN_EMAIL=/d' .env
        echo "BOOTSTRAP_ADMIN_EMAIL=admin@renace.tech" >> .env
    fi
    if ! grep -q "^BOOTSTRAP_ADMIN_PASSWORD=." .env; then
        echo "🔑 Configurando BOOTSTRAP_ADMIN_PASSWORD..."
        sed -i '/^BOOTSTRAP_ADMIN_PASSWORD=/d' .env
        echo "BOOTSTRAP_ADMIN_PASSWORD=CatagceAdmin2026!" >> .env
    fi

    # Asegurar que BOOTSTRAP_TENANT esté configurado
    if ! grep -q "^BOOTSTRAP_TENANT_EMAIL=." .env; then
        echo "🏬 Configurando BOOTSTRAP_TENANT_EMAIL (Jhosua Comercial)..."
        sed -i '/^BOOTSTRAP_TENANT_EMAIL=/d' .env
        echo "BOOTSTRAP_TENANT_EMAIL=catalogo@jhosuacomercial.com" >> .env
    fi
    if ! grep -q "^BOOTSTRAP_TENANT_PASSWORD=." .env; then
        echo "🔑 Configurando BOOTSTRAP_TENANT_PASSWORD..."
        sed -i '/^BOOTSTRAP_TENANT_PASSWORD=/d' .env
        echo "BOOTSTRAP_TENANT_PASSWORD=CatagceTenant2026!" >> .env
    fi
    if ! grep -q "^BOOTSTRAP_TENANT_NAME=." .env; then
        sed -i '/^BOOTSTRAP_TENANT_NAME=/d' .env
        echo "BOOTSTRAP_TENANT_NAME='Jhosua Comercial'" >> .env
    fi
    if ! grep -q "^BOOTSTRAP_TENANT_SLUG=." .env; then
        sed -i '/^BOOTSTRAP_TENANT_SLUG=/d' .env
        echo "BOOTSTRAP_TENANT_SLUG=jhosuacom" >> .env
    fi

    # Asegurar que MIGRATIONS_STRICT esté en 1 para producción
    if ! grep -q "^MIGRATIONS_STRICT=." .env; then
        echo "📊 Configurando MIGRATIONS_STRICT=1..."
        sed -i '/^MIGRATIONS_STRICT=/d' .env
        echo "MIGRATIONS_STRICT=1" >> .env
    fi

    # Cargar variables actualizadas
    set -a; source .env; set +a
else
    echo "❌ Error: Archivo .env no encontrado en $PROJECT_DIR"
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
