#!/bin/bash
# Arreglar conexión API → Postgres (sin rebuild, ~1 min)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

git fetch --all && git reset --hard origin/main

echo "🚢 Deploy stack (host catagce-db + alias DNS)..."
docker stack deploy -c docker-compose.yml catagce

echo "🔄 Reiniciar api..."
docker service update --force \
  --update-failure-action rollback \
  --update-order start-first \
  catagce_api

echo "⏳ Esperando 45s..."
sleep 45

echo ""
echo "═══ DNS desde API ═══"
API=$(docker ps -q -f name=catagce_api.1 | head -1)
if [ -n "$API" ]; then
  docker exec "$API" node -e "
    const dns=require('dns');
    for (const h of ['db','catagce-db','catagce_db']) {
      dns.lookup(h,(e,a)=>console.log(h+':',e?e.code:a));
    }
  " 2>&1 || true
fi

echo ""
echo "═══ Health ═══"
curl -sf https://api.catagce.renace.tech/api/health && echo "" || echo "❌ liveness"
curl -sf https://api.catagce.renace.tech/api/health/ready && echo "" || echo "❌ readiness (DB)"

echo ""
echo "═══ Login ═══"
if [ -n "$API" ]; then
  docker exec "$API" node -e "
    const http=require('http');
    const b=JSON.stringify({email:'admin@renace.tech',password:'CatagceAdmin2026!'});
    http.request({hostname:'127.0.0.1',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':b.length}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('HTTP',r.statusCode,d.slice(0,200)))}).end(b);
  " 2>&1 || true
fi
