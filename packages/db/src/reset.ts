import { createClient } from './index';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://catagce_admin:catagce@localhost:5432/catagce_prod';

async function reset() {
  console.log('🗑️  Purga de base de datos...');
  const db = createClient(DATABASE_URL);

  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO catagce_admin`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  console.log('✅ Base de datos purgada. Ejecuta: pnpm --filter @catagce/db push && pnpm --filter @catagce/db seed');
  process.exit(0);
}

reset().catch((err) => { console.error('❌ Error:', err); process.exit(1); });
