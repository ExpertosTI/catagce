#!/bin/bash
# Prueba endpoints del dashboard con JWT (detecta 500 vs 401)
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

API=$(docker ps -q -f name=catagce_api.1 | head -1)
if [ -z "$API" ]; then echo "❌ API no corre"; exit 1; fi

test_endpoint() {
  local method=$1 path=$2 token=$3
  docker exec "$API" node -e "
    const http=require('http');
    const opts={hostname:'127.0.0.1',port:3000,path:'$path',method:'$method',headers:{Authorization:'Bearer $token'}};
    http.request(opts,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('$method $path',r.statusCode,d.slice(0,80)))}).on('error',e=>console.log('ERR',e.message)).end();
  " 2>&1
}

echo "═══ Login ═══"
TOKEN=$(docker exec "$API" node -e "
  const http=require('http');
  const b=JSON.stringify({email:'admin@renace.tech',password:'CatagceAdmin2026!'});
  http.request({hostname:'127.0.0.1',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':b.length}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{console.log(JSON.parse(d).token)}catch{console.log('')}})}).end(b);
" 2>/dev/null | tail -1)

if [ -z "$TOKEN" ]; then echo "❌ No se obtuvo token"; exit 1; fi
echo "Token OK (${#TOKEN} chars)"

echo ""
echo "═══ Endpoints dashboard ═══"
for ep in \
  "GET /api/analytics/dashboard" \
  "GET /api/sellers/me" \
  "GET /api/products" \
  "GET /api/catalogs" \
  "GET /api/orders" \
  "GET /api/inventory/levels" \
  "GET /api/inventory/movements" \
  "GET /api/inventory/low-stock" \
  "GET /api/webhooks" \
  "GET /api/integrations" \
  "GET /api/ai/config"; do
  method=$(echo "$ep" | awk '{print $1}')
  path=$(echo "$ep" | awk '{print $2}')
  test_endpoint "$method" "$path" "$TOKEN"
done
