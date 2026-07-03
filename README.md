# GHome — Plataforma de Importación y Facturación

Sistema para empresas importadoras: facturar clientes, crédito, despachos parciales, preventas, catálogos y portal de clientes.

**Producción:** [generalhome.tech](https://generalhome.tech)  
**Rama:** `ghome`

## URLs de producción

| Servicio | URL |
|----------|-----|
| Sitio público + portal clientes | https://generalhome.tech |
| Panel administrador | https://admin.generalhome.tech |
| API | https://api.generalhome.tech/api |

## DNS requerido

Apunte estos registros al servidor con Traefik:

- `generalhome.tech` → portal
- `www.generalhome.tech` → portal
- `admin.generalhome.tech` → admin
- `api.generalhome.tech` → API

## Inicio rápido (local)

```bash
git checkout ghome
cp .env.example .env
pnpm install
pnpm --filter @ghome/db push
pnpm --filter @ghome/db seed

pnpm --filter @ghome/api dev              # :3000
pnpm --filter @ghome/client-portal dev    # :3001
pnpm --filter @ghome/admin-web dev        # :3002
```

## Deploy producción (servidor Renace)

**No cree una carpeta vacía.** Clone el repositorio:

```bash
cd /opt
git clone https://github.com/ExpertosTI/catagce.git ghome
cd ghome
git checkout ghome
cp .env.example .env
nano .env   # DB_PASSWORD, JWT_SECRET

bash scripts/deploy-ghome.sh
bash scripts/ghome-db-init.sh all
```

**Actualizar después de cambios en `ghome`:**

```bash
cd /opt/ghome
bash scripts/ghome-deploy-latest.sh
```

El script valida `JWT_SECRET` y `DB_PASSWORD`, reconstruye imágenes y verifica `/api/health`.

> No necesita `pnpm` en el servidor — la DB se inicializa con Docker.


### Credenciales (producción)

En el servidor no hace falta escribir contraseñas a mano:

```bash
cd /opt/ghome
bash scripts/ghome-ensure-secrets.sh    # genera secretos débiles/faltantes
bash scripts/ghome-sync-admin-password.sh
bash scripts/ghome-deploy-latest.sh
```

Las credenciales se muestran **una sola vez** y se guardan en `/root/.ghome-credentials-*.txt` (fuera del repo, `chmod 600`). Cópielas a un gestor de contraseñas y elimine ese archivo del servidor.

### Desarrollo local

Tras `pnpm --filter @ghome/db seed` sin `ADMIN_PASSWORD`, el seed imprime una contraseña temporal en consola (no se usa `demo1234`).

## Arquitectura

```
apps/api/            NestJS — facturas, despachos, clientes, productos
apps/admin-web/      Next.js — panel del importador (admin.generalhome.tech)
apps/client-portal/  Next.js — landing + e-commerce + portal (generalhome.tech)
packages/db/         Drizzle schema + seed
```

## Variables de entorno

```env
NEXT_PUBLIC_SITE_URL=https://generalhome.tech
NEXT_PUBLIC_ADMIN_URL=https://admin.generalhome.tech
NEXT_PUBLIC_API_URL=https://api.generalhome.tech/api
NEXT_PUBLIC_COMPANY_SLUG=generalhome
CORS_ORIGINS=https://generalhome.tech,https://www.generalhome.tech,https://admin.generalhome.tech
```
