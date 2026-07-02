import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import * as schema from './schema';

export * from './schema';

export const createClient = (connectionString: string) => {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
};

/** Conexión por host/user/password — evita romper URLs con caracteres especiales en la clave */
export function createClientFromEnv(): ReturnType<typeof drizzle> {
  let client: Sql;
  if (process.env.DATABASE_URL) {
    client = postgres(process.env.DATABASE_URL);
  } else if (process.env.DB_HOST) {
    client = postgres({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'ghome_prod',
      user: process.env.DB_USER ?? 'ghome_admin',
      password: process.env.DB_PASSWORD ?? '',
    });
  } else {
    throw new Error('DATABASE_URL or DB_HOST is required');
  }
  return drizzle(client, { schema });
}
