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

> No necesita `pnpm` en el servidor — la DB se inicializa con Docker.


### Credenciales demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@generalhome.tech` | `demo1234` |
| Cliente | `cliente@demo.com` | `demo1234` |

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
