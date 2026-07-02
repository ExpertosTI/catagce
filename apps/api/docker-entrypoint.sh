#!/bin/sh
set -e
if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD")
  export DATABASE_URL="postgres://${DB_USER:-ghome_admin}:${ENC}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-ghome_prod}"
fi
exec "$@"
