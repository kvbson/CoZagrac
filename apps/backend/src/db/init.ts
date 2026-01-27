import * as schema from '../drizzle/schema.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
  ssl: false,
});

export const db = drizzle(pool, { schema });
