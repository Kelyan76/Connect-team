import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/rls/**/*.test.ts', 'tests/backend/**/*.test.ts', 'tests/notifications/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
