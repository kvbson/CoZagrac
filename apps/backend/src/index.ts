import './env.js';
import './auth/steam.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mainRouter from './routes/index.js';
import { pool } from './db/init.js';
import { checkDbConnection } from './db/utils/healthCheck.js';
import { pgSession } from './db/sessions/index.js';
import passport from 'passport';
import { domain, isDev, PORT } from './config/runtime.js';

const app = express();

// Server configuration
app.use(express.json());
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'https: data:'],
    },
  }),
);

if (!isDev) {
  app.use(
    cors({
      origin: domain,
      credentials: true,
    }),
  );
}

app.use(pgSession);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(mainRouter);

// Start server
async function startServer() {
  console.log(`[ENV] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[ENV] PORT: ${PORT}`);
  const server = isDev ? app.listen(PORT, onSuccess) : app.listen(PORT, '0.0.0.0', onSuccess);

  try {
    await checkDbConnection();
    console.log('Database connection successful.');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  // Set server timeouts
  server.timeout = 70000; // 70 seconds
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const shutdown = async () => {
    console.log('Shutting down server...');
    await pool.end();
    console.log('Database connections closed.');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });

    // Force exit if server is not shut down within 5 seconds
    setTimeout(async () => {
      console.log('Forcefully shutting down the server.');
      process.exit(1);
    }, 5000);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const onSuccess = () => {
  console.log('Backend running on http://localhost:3001');
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
