import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ServerResponse } from 'node:http';
import { handleMockApiRequest, mockApiPlugin } from './mockApiPlugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isDev = mode === 'development' || mode === 'mock';
  // mock API when explicitly running the mock mode (npm run dev:mock) or when
  // no backend target is configured (VITE_API_URL missing from frontend .env)
  const apiTarget = env.VITE_API_URL;
  const withMockApi = mode === 'mock' || !apiTarget;
  return {
    plugins: [
      ...(withMockApi ? [mockApiPlugin()] : []),
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
          // proxy only when a backend target exists; when the backend is down,
          // requests fall back to the mock API so the frontend stays usable
          ...(apiTarget
            ? {
                proxy: {
                  '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    secure: false,
                    configure: (proxy) => {
                      let warned = false;
                      proxy.on('error', (err, req, res) => {
                        const code = (err as NodeJS.ErrnoException).code ?? err.message;
                        if (!warned) {
                          console.warn(`[mock-api] backend unreachable (${code}), serving mock responses until it is back`);
                          warned = true;
                        }
                        if (res instanceof ServerResponse && !res.headersSent) {
                          void handleMockApiRequest(req, res);
                        }
                      });
                    },
                  },
                },
              }
            : {}),
        }
      : undefined,
  };
});
