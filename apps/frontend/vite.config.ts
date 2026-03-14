import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', 'REACT_APP_');

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    define: {
      'process.env': env,
    },
    server: {
      proxy: {
        '/api': env.REACT_APP_API_URL,
      },
      changeOrigin: true,
    },
  };
});
