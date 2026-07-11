#!/bin/bash
# Fuerza variables DB en catagce_api (lee .env sin romper passwords con caracteres especiales)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

read_env() {
  local key=$1
  grep "^${key}=" .env 2>/dev/null | cut -d= -f2- || true
}

DB_PASSWORD=$(read_env DB_PASSWORD)
JWT_SECRET=$(read_env JWT_SECRET)
GOOGLE_AI_API_KEY=$(read_env GOOGLE_AI_API_KEY)
GOOGLE_AI_MODEL=$(read_env GOOGLE_AI_MODEL)
GOOGLE_AI_MODEL=${GOOGLE_AI_MODEL:-gemini-2.5-flash}

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ DB_PASSWORD vacío en .env"
  exit 1
fi

ENC_PW=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD" 2>/dev/null || \
  docker run --rm node:20-alpine node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD")

ENC_URL="postgres://catagce_admin:${ENC_PW}@catagce-db:5432/catagce_prod"

echo "🔧 Actualizando env de catagce_api..."
docker service update \
  --update-failure-action rollback \
  --update-order start-first \
  --env-rm DATABASE_URL \
  --env-rm DB_HOST \
  --env-rm DB_USER \
  --env-rm DB_PASSWORD \
  --env-rm DB_NAME \
  --env-add "DATABASE_URL=${ENC_URL}" \
  --env-add "DB_HOST=catagce-db" \
  --env-add "DB_USER=catagce_admin" \
  --env-add "DB_PASSWORD=${DB_PASSWORD}" \
  --env-add "DB_NAME=catagce_prod" \
  --env-add "REDIS_HOST=catagce-redis" \
  --env-add "REDIS_PORT=6379" \
  --env-add "JWT_SECRET=${JWT_SECRET}" \
  --env-add "GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}" \
  --env-add "GOOGLE_AI_MODEL=${GOOGLE_AI_MODEL}" \
  catagce_api 2>&1 | tail -8

echo "⏳ Esperando 40s..."
sleep 40

echo ""
curl -sf https://api.catagce.renace.tech/api/health/ready && echo "" || echo "❌ readiness"

API=$(docker ps -q -f name=catagce_api.1 | head -1)
if [ -n "$API" ]; then
  docker exec "$API" node -e "
    const http=require('http');
    const b=JSON.stringify({email:'admin@renace.tech',password:'CatagceAdmin2026!'});
    http.request({hostname:'127.0.0.1',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':b.length}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('login',r.statusCode,d.slice(0,120)))}).end(b);
  " 2>&1 || true
fi
