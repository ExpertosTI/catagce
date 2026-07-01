#!/bin/sh
set -e
# Construye DATABASE_URL con password codificada (evita romper URLs con +, /, = en base64)
if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD")
  export DATABASE_URL="postgres://${DB_USER:-catagce_admin}:${ENC}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-catagce_prod}"
fi
exec "$@"
