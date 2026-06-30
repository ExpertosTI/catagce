#!/bin/bash
# Arreglar conexión API → Postgres (sin rebuild, ~1 min)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

export $(grep -v '^#' .env | xargs)

encode_pw() {
  node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD" 2>/dev/null || \
    docker run --rm node:20-alpine node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD"
}

echo "═══ 1. Probar Postgres con objeto (sin URL) ═══"
API=$(docker ps -q -f name=catagce_api.1 | head -1)
if [ -n "$API" ]; then
  docker exec -e DB_PASSWORD="$DB_PASSWORD" "$API" node -e "
    const postgres = require('postgres');
    const sql = postgres({
      host: 'catagce-db', port: 5432, database: 'catagce_prod',
      user: 'catagce_admin', password: process.env.DB_PASSWORD,
    });
    sql\`SELECT 1 as ok\`.then(r => { console.log('DIRECT OK', r); sql.end(); })
      .catch(e => { console.error('DIRECT FAIL', e.message); sql.end(); process.exit(1); });
  " 2>&1 || true
fi

echo ""
echo "═══ 2. Deploy stack (DB_HOST + alias DNS) ═══"
docker stack deploy -c docker-compose.yml catagce

echo ""
echo "═══ 3. Parche DATABASE_URL codificada (imagen actual sin DB_HOST) ═══"
ENC_PW=$(encode_pw)
ENC_URL="postgres://catagce_admin:${ENC_PW}@catagce-db:5432/catagce_prod"
docker service update --force \
  --update-failure-action rollback \
  --update-order start-first \
  --env-add "DATABASE_URL=${ENC_URL}" \
  --env-add "DB_HOST=catagce-db" \
  --env-add "DB_USER=catagce_admin" \
  --env-add "DB_PASSWORD=${DB_PASSWORD}" \
  --env-add "DB_NAME=catagce_prod" \
  catagce_api 2>&1 | tail -5

echo "⏳ Esperando 45s..."
sleep 45

echo ""
echo "═══ Health ═══"
curl -sf https://api.catagce.renace.tech/api/health && echo "" || echo "❌ liveness"
curl -sf https://api.catagce.renace.tech/api/health/ready && echo "" || echo "❌ readiness (DB)"

echo ""
echo "═══ Login ═══"
API=$(docker ps -q -f name=catagce_api.1 | head -1)
if [ -n "$API" ]; then
  docker exec "$API" node -e "
    const http=require('http');
    const b=JSON.stringify({email:'admin@renace.tech',password:'CatagceAdmin2026!'});
    http.request({hostname:'127.0.0.1',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':b.length}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('HTTP',r.statusCode,d.slice(0,200)))}).end(b);
  " 2>&1 || true
  echo ""
  docker service logs catagce_api --tail 8 2>&1 | grep -iE 'login|health|failed|error|postgres' || true
fi

echo ""
echo "Si readiness sigue fallando, rebuild con soporte DB_HOST:"
echo "  bash scripts/rebuild-api.sh"
