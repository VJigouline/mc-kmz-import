import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // three.js reads this format's XML with DOMParser, which Node lacks.
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 120000,
    coverage: {
      include: ['src/**/*.ts'],
    },
  },
});
