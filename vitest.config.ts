import { defineConfig } from 'vitest/config'

// Standalone config (does not load vite.config.ts) so the PWA plugin doesn't run
// during tests. Covers the Worker's pure logic — the highest-blast-radius code.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['worker/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
