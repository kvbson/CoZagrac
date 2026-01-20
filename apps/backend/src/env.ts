import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing');
}
