import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// own directory as tsconfigRootDir: in a monorepo the parser otherwise finds
// both apps/backend and apps/frontend tsconfigs and demands an explicit value
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
]);
