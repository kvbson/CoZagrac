import { pool } from '@api/db/init.js';
import { checkDbConnection } from '@api/db/utils/healthCheck.js';
import mainRouter from '@api/routes/index.js';
import '@api/env';
import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const isDev = process.env.NODE_ENV === 'development';

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
