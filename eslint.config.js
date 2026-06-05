import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The Worker runs in the Cloudflare runtime, not the browser — it is type-checked
  // separately via worker/tsconfig.json, so keep it out of the browser-globals lint.
  globalIgnores(['dist', 'worker', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Intentional patterns in this app: fetching data on mount, context files that
      // export a hook beside their provider, and rethrowing a friendlier message.
      // Keep them as warnings so they don't block CI (revisit case-by-case later).
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
])
