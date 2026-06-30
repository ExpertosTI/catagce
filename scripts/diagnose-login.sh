#!/bin/bash
# Diagnóstico login 500 — DB, usuarios, prueba local
set -euo pipefail
cd /opt/QuickCtgo 2>/dev/null || cd /opt/catagce

export $(grep -v '^#' .env | xargs)
DB_CONTAINER=$(docker ps -q -f name=catagce_db.1 | head -1)
API_CONTAINER=$(docker ps -q -f name=catagce_api.1 | head -1)

echo "═══ Tablas auth ═══"
docker exec "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod -c "\dt seller*" 2>&1 || true

echo ""
echo "═══ Usuarios en seller_users ═══"
docker exec "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod -c \
  "SELECT email, is_active, role, left(password_hash, 7) AS hash_prefix FROM seller_users;" 2>&1 || true

echo ""
echo "═══ API keys ═══"
docker exec "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod -c \
  "SELECT name, key FROM seller_api_keys;" 2>&1 || true

echo ""
echo "═══ Login local (desde contenedor API) ═══"
if [ -n "$API_CONTAINER" ]; then
  docker exec "$API_CONTAINER" node -e "
    const http = require('http');
    const body = JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@renace.tech',
      password: process.env.ADMIN_PASSWORD || 'CatagceAdmin2026!',
    });
    const req = http.request({
      hostname: '127.0.0.1', port: 3000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => console.log('HTTP', res.statusCode, data.slice(0, 500)));
    });
    req.on('error', (e) => console.error('ERROR', e.message));
    req.write(body);
    req.end();
  " 2>&1 || true
else
  echo "⚠️  No hay contenedor catagce_api corriendo"
fi

echo ""
echo "═══ Logs API tras login ═══"
docker service logs catagce_api --tail 10 2>&1 | grep -i login || docker service logs catagce_api --tail 5 2>&1 || true

COUNT=$(docker exec "$DB_CONTAINER" psql -U catagce_admin -d catagce_prod -tAc "SELECT count(*) FROM seller_users;" 2>/dev/null || echo "0")
if [ "${COUNT// /}" = "0" ]; then
  echo "❌ No hay usuarios — ejecuta: bash scripts/reset-and-seed-server.sh seed"
  echo "   (o all para reset completo)"
fi
