import * as schema from '@api/drizzle/schema.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type Tx = NodePgDatabase<typeof schema>;
