#!/bin/bash
# ==============================================================================
# 🔍 CATAGCE — Encontrar contenedor y desplegar actualización en Renace VPS
# Ejecutar en el servidor: bash scripts/server-deploy.sh
# ==============================================================================

set -e

echo "═══════════════════════════════════════════════════"
echo "  CATAGCE — Diagnóstico y Deploy"
echo "═══════════════════════════════════════════════════"

# 1. Encontrar proyecto
if [ -d "/opt/catagce" ]; then
  PROJECT_DIR="/opt/catagce"
elif [ -d "/opt/QuickCtgo" ]; then
  PROJECT_DIR="/opt/QuickCtgo"
  echo "⚠️  Proyecto en /opt/QuickCtgo (nombre legacy)"
else
  echo "❌ No se encontró catagce. Buscando..."
  find /opt -maxdepth 2 -name "docker-compose.yml" 2>/dev/null | while read f; do
    if grep -q "catagce" "$f" 2>/dev/null; then
      echo "  → Encontrado: $(dirname $f)"
    fi
  done
  echo "Clona con: git clone https://github.com/ExpertosTI/catagce /opt/catagce"
  exit 1
fi

echo "📁 Proyecto: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 2. Encontrar stack/contenedores
echo ""
echo "🐳 Docker Stacks:"
docker stack ls 2>/dev/null || true

echo ""
echo "🐳 Servicios Catagce:"
docker service ls 2>/dev/null | grep -i catagce || docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -i catagce || echo "  (ninguno encontrado con nombre catagce)"

echo ""
echo "🐳 Todos los contenedores (catagce/quick):"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -iE "catagce|quick" || true

# 3. Disco (servidor al 90% — advertir)
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 85 ]; then
  echo ""
  echo "⚠️  DISCO AL ${DISK_PCT}% — Limpiando imágenes Docker antiguas..."
  docker system prune -af --filter "until=72h" 2>/dev/null || true
  docker builder prune -af 2>/dev/null || true
fi

# 4. Sync código (forzar versión remota — evita error "divergent branches")
echo ""
echo "📥 Actualizando código desde Git..."
git fetch --all
git reset --hard origin/main

# 5. .env
if [ ! -f .env ]; then
  echo "🔐 Creando .env..."
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

# Asegurar vars en .env
grep -q "NEXT_PUBLIC_API_URL" .env || echo "NEXT_PUBLIC_API_URL=https://api.catagce.renace.tech/api" >> .env
grep -q "GOOGLE_AI_API_KEY" .env || echo "GOOGLE_AI_API_KEY=" >> .env

# 6. Build
echo ""
echo "🏗️  Construyendo imágenes..."
export $(grep -v '^#' .env | xargs)
docker compose build --parallel api web

# 7. Deploy stack
echo ""
echo "🚢 Desplegando stack..."
docker stack deploy -c <(docker compose config) catagce

# 8. Migraciones DB (schema completo vía drizzle-kit push)
echo ""
echo "🗄️  Aplicando schema DB..."
DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)
DB_HOST="catagce_db"
docker run --rm --network RenaceNet \
  -e DATABASE_URL="postgres://catagce_admin:${DB_PASSWORD}@${DB_HOST}:5432/catagce_prod" \
  -v "$PROJECT_DIR:/app" \
  -w /app node:20-alpine sh -c "
    set -e
    npm install -g pnpm
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm --filter @catagce/db push
  " && echo "  ✓ drizzle push OK" || echo "⚠️  drizzle push falló — ejecuta manualmente (ver abajo)"

# 9. Force update servicios
echo ""
echo "🔄 Reiniciando servicios..."
for svc in api web media-processor catalog-renderer notifications; do
  docker service update --force "catagce_${svc}" 2>/dev/null && echo "  ✓ catagce_${svc}" || true
done

# 10. Health check
echo ""
echo "🏥 Health check..."
sleep 10
curl -sf https://api.catagce.renace.tech/api/health && echo " API OK" || echo " API pendiente..."
curl -sf -o /dev/null -w "%{http_code}" https://catagce.renace.tech && echo " Web OK" || echo " Web pendiente..."

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ DEPLOY COMPLETADO"
echo "  Web:    https://catagce.renace.tech"
echo "  API:    https://api.catagce.renace.tech/api/health"
echo "  Onboarding: /onboarding (nuevos usuarios)"
echo "═══════════════════════════════════════════════════"
