import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isDev = mode === 'development';
  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: isDev
      ? {
          host: true,
          port: 5137,
          strictPort: true,
          cors: true,
          origin: 'http://localhost:5137',
          fs: {
            strict: false,
          },
          hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 5137,
          },
          proxy: {
            '/api': {
              target: env.VITE_API_URL,
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
  };
});
