import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { isDev } from '../../config/runtime.js';
import { pool } from '../init.js';

const PgStore = connectPgSimple(session);

export const pgSession = session({
  store: new PgStore({
    pool,
    tableName: 'sessions',
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    httpOnly: true,
    secure: !isDev,
    maxAge: 1000 * 60 * 60 * 24,
  },
});
