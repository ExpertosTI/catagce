import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

export type CatagceDb = ReturnType<typeof drizzle<typeof schema>>;

export interface CreateClientOptions {
  /** Max simultaneous connections from this client. */
  max?: number;
  /** Seconds to wait for a free connection before erroring. */
  connectTimeout?: number;
  /** Seconds an idle connection stays in pool. */
  idleTimeout?: number;
  /** When true, prepared statements are disabled (needed by pgBouncer in transaction mode). */
  disablePreparedStatements?: boolean;
}

export function createPostgresClient(connectionString: string, opts: CreateClientOptions = {}) {
  return postgres(connectionString, {
    max: opts.max ?? 20,
    connect_timeout: opts.connectTimeout ?? 10,
    idle_timeout: opts.idleTimeout ?? 30,
    prepare: opts.disablePreparedStatements ? false : true,
    ssl: connectionString.includes('sslmode=require') ? 'require' : undefined,
    onnotice: () => {},
  });
}

export function createClient(connectionString: string, opts?: CreateClientOptions): CatagceDb {
  const client = createPostgresClient(connectionString, opts);
  return drizzle(client, { schema, logger: process.env.DB_LOG === '1' });
}
