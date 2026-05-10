# Catagce Platform

B2B Catalog Sales Operating System.

## Project Structure

- `apps/api`: NestJS Backend API.
- `apps/buyer-web`: Next.js Frontend (Buyer Flow).
- `packages/db`: Drizzle ORM Schema & Client.
- `packages/typescript-config`: Shared TS settings.

## Development

1. Install dependencies (requires internet):
   ```bash
   pnpm install
   ```

2. Run in development:
   ```bash
   pnpm dev
   ```

## Deployment (Renace Protocol)

This project is ready to be deployed to `catagce.renace.tech`.

1. **Upload code to VPS**:
   ```bash
   git clone <repo_url> /opt/catagce
   ```

2. **Configure Environment**:
   ```bash
   cd /opt/catagce
   cp .env.example .env
   # Edit .env with production secrets
   ```

3. **Deploy**:
   ```bash
   bash deploy.sh
   ```

## Technology Stack

- **Frontend**: Next.js 14, Framer Motion, Tailwind CSS.
- **Backend**: NestJS, PostgreSQL.
- **Database**: Drizzle ORM.
- **Infrastructure**: Docker Swarm, Traefik, RenaceNet.

## 🛠️ Conectando a InsForge (Superpowers Backend)

Catagce utiliza **InsForge** como plataforma agent-native para sus servicios de backend, almacenamiento y procesamiento de IA.

### 1. Conexión vía MCP (Recomendado para Agentes)
Si estás utilizando un asistente como Cursor, Windsurf o Claude Code:
```bash
npx insforge mcp install --project catagce
```
Esto permitirá que el agente descubra automáticamente la base de datos y los servicios de almacenamiento sin configurar API keys manualmente.

### 2. Conexión vía SDK (Aplicación)
Para integrar los "Superpoderes" en el código:
```bash
pnpm add @insforge/sdk
```
Luego inicializa el cliente en `apps/api`:
```typescript
import { createClient } from '@insforge/sdk';
const insforge = createClient({ apiKey: process.env.INSFORGE_API_KEY });
```
