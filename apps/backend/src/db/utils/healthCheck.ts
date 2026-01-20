import { pool } from '../init.js';

export async function checkDbConnection() {
  await pool.query('SELECT 1');
}
