# Catagce Platform

B2B Catalog Sales Operating System — SaaS multi-tenant completo para mayoristas.

## Características

### Core
- **Multi-tenant** con aislamiento por vendedor
- **Auth JWT** (email/password) + API keys para integraciones
- **Registro self-service** con setup automático (UOMs, almacén, lista de precios)
- **Productos completos**: CRUD, variantes, códigos de barras, categorías, media
- **Inventario**: almacenes, movimientos, ajustes, entradas, stock bajo
- **Reservas de stock** automáticas al crear pedidos
- **Catálogos** compartibles con tokens y snapshots inmutables
- **PDF** generado por worker BullMQ (Puppeteer)
- **Pedidos B2B** con items, eventos, contactos de compradores
- **Analítica** dashboard con ingresos, top productos, pedidos pendientes

### Superpower AI (Google Gemini)
- **Asistente inteligente** con 18 herramientas que ejecutan acciones reales
- Configura tu **Google AI API Key** por vendedor
- Chat flotante en el dashboard
- Gestiona productos, inventario, catálogos, pedidos, integraciones y más por lenguaje natural

### Integraciones
- **Odoo** — JSON-RPC productos + stock
- **Shopify** — Admin API productos
- **WooCommerce** — REST API productos
- **Webhooks** — HTTP POST firmados (HMAC-SHA256)

### Base de datos (30+ tablas)
`sellers`, `seller_users`, `seller_api_keys`, `seller_branding`, `seller_settings`,
`products`, `product_variants`, `product_barcodes`, `product_media`,
`uoms`, `price_lists`, `price_list_items`,
`warehouses`, `stock_levels`, `stock_movements`, `stock_reservations`,
`catalogs`, `catalog_templates`, `catalog_products`, `catalog_publications`, `catalog_publication_assets`,
`orders`, `order_items`, `order_item_allocations`, `order_events`, `buyer_contacts`,
`webhooks`, `webhook_deliveries`, `integrations`, `integration_logs`,
`audit_logs`, `notifications`, `idempotency_keys`, `job_runs`

## Inicio rápido

```bash
cp .env.example .env
pnpm install
pnpm --filter @catagce/db push
pnpm --filter @catagce/db seed
pnpm dev
```

### Credenciales demo
| Campo | Valor |
|-------|-------|
| Email | `demo@renace.tech` |
| Password | `demo1234` |
| API Key | `cat_demo_renace_2026` |
| Catálogo | `/catalog/mayorista-2026` |
| Pedido | `/order/cat_demo_share_token_2026` |

## API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registrar vendedor |
| POST | `/api/auth/login` | No | Login JWT |
| GET | `/api/products` | JWT/Key | Listar productos |
| POST | `/api/products` | JWT/Key | Crear producto |
| PATCH | `/api/products/:id` | JWT/Key | Actualizar producto |
| GET | `/api/inventory/levels` | JWT/Key | Niveles de stock |
| POST | `/api/inventory/inbound` | JWT/Key | Entrada de stock |
| POST | `/api/inventory/adjust` | JWT/Key | Ajuste de stock |
| GET | `/api/analytics/dashboard` | JWT/Key | Métricas |
| POST | `/api/ai/chat` | JWT/Key | Chat con asistente AI |
| PATCH | `/api/ai/config` | JWT/Key | Configurar Google API Key |
| POST | `/api/integrations/:id/sync` | JWT/Key | Sincronizar ERP |
| GET | `/api/public/catalog/:token` | No | Catálogo público |
| POST | `/api/public/orders` | No | Crear pedido |

Autenticación: `Authorization: Bearer <jwt>` o `x-api-key: cat_...`

## Estructura

```
apps/api/          NestJS API
apps/buyer-web/    Next.js panel + catálogo público
packages/db/       Drizzle schema + seed
workers/           media-processor, catalog-renderer, notifications
```

## Deploy

```bash
git clone <repo> /opt/catagce
cd /opt/catagce && cp .env.example .env
bash deploy.sh
```
