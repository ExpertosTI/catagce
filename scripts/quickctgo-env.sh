#!/usr/bin/env bash
# Carga .env y credenciales WhatsApp sin sobrescribir valores ya definidos.
# Uso: source scripts/quickctgo-env.sh

quickctgo_repo_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}")/.." && pwd)"
  printf '%s' "$here"
}

# Añade KEY=valor a .env solo si la clave no existe (no modifica líneas existentes).
quickctgo_ensure_env_key() {
  local key="$1" val="$2" file="${3:-.env}"
  [ -f "$file" ] || return 0
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    return 0
  fi
  printf '%s=%s\n' "$key" "$val" >> "$file"
  echo "  · añadido ${key} a ${file} (faltaba)"
}

# Carga archivo KEY=VAL sin pisar variables ya exportadas ni las de .env.
quickctgo_load_secrets_file() {
  local file="$1" line key val
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"
    val="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [ -z "${!key:-}" ]; then
      export "$key=$val"
    fi
  done < "$file"
}

quickctgo_load_env() {
  local root="${1:-$(quickctgo_repo_root)}"
  cd "$root"

  if [ ! -f .env ]; then
    echo "❌ No hay .env en $(pwd)"
    echo "   Este deploy no crea ni adivina secretos."
    echo "   Si el servidor ya tenía Catagce, conserve su .env actual."
    echo "   Solo primera instalación: cp .env.quickctgo.example .env && nano .env"
    return 1
  fi

  # shellcheck disable=SC1091
  set -a && source .env && set +a

  # Completar URLs públicas solo si faltan en .env (no reemplaza)
  quickctgo_ensure_env_key NEXT_PUBLIC_API_URL "https://api.catagce.renace.tech/api"
  quickctgo_ensure_env_key NEXT_PUBLIC_SITE_URL "https://catagce.renace.tech"
  quickctgo_ensure_env_key NEXT_PUBLIC_ADMIN_URL "https://catagce.renace.tech"
  quickctgo_ensure_env_key NEXT_PUBLIC_COMPANY_SLUG "catagce"
  quickctgo_ensure_env_key CORS_ORIGINS "https://catagce.renace.tech,https://www.catagce.renace.tech"
  quickctgo_ensure_env_key PUBLIC_SITE_URL "https://catagce.renace.tech"

  # shellcheck disable=SC1091
  set -a && source .env && set +a

  # WhatsApp: .evolution.local o vars ya en .env — sin sobrescribir
  quickctgo_load_secrets_file .evolution.local

  export PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-https://catagce.renace.tech}}"
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://catagce.renace.tech}"
  export NEXT_PUBLIC_ADMIN_URL="${NEXT_PUBLIC_ADMIN_URL:-https://catagce.renace.tech}"
  export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.catagce.renace.tech/api}"
  export NEXT_PUBLIC_COMPANY_SLUG="${NEXT_PUBLIC_COMPANY_SLUG:-catagce}"
  export CORS_ORIGINS="${CORS_ORIGINS:-https://catagce.renace.tech,https://www.catagce.renace.tech}"
}

quickctgo_whatsapp_ready() {
  [ -n "${EVOLUTION_API_URL:-}" ] && [ -n "${EVOLUTION_API_KEY:-}" ] && [ -n "${EVOLUTION_INSTANCE:-}" ]
}
