import * as schema from '../drizzle/schema.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { isDev } from '../config/runtime.js';

/**
 * TLS do bazy steruje WYŁĄCZNIE zmienna DB_SSL:
 *  - 'disable'   - bez TLS (domyślnie w dev, np. tunel SSH do localhost)
 *  - 'no-verify' - TLS bez sprawdzania certyfikatu (self-signed na własnym VPS)
 *  - 'verify'    - TLS + weryfikacja certyfikatu (domyślnie na prod)
 * Parametry ?ssl / ?sslmode z DATABASE_URL są usuwane: pg przy parsowaniu
 * connection string nadpisuje nimi opcje podane w kodzie
 * (Object.assign w pg/lib/connection-parameters.js), co przy tunelu SSH
 * dawało DEPTH_ZERO_SELF_SIGNED_CERT mimo ssl:false.
 */
const dbSslMode = process.env.DB_SSL || (isDev ? 'disable' : 'verify');

const ssl =
  dbSslMode === 'disable'
    ? false
    : dbSslMode === 'no-verify'
      ? { rejectUnauthorized: false }
      : true;

function databaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? '';
  try {
    const url = new URL(raw);
    url.searchParams.delete('ssl');
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return raw;
  }
}

export const pool = new Pool({
  connectionString: databaseUrl(),
  ssl,
  // liczba połączeń
  max: 10,
  min: 0,

  // timeouty
  connectionTimeoutMillis: 5000, // ile czekamy na NOWE połączenie
  idleTimeoutMillis: 30000, // kiedy zamykamy idle connection
  statement_timeout: 15000, // max czas query (server-side)
  query_timeout: 15000, // max czas query (client-side)

  // utrzymaj połączenie przy życiu
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export const db = drizzle(pool, { schema });
