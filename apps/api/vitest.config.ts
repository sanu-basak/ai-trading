import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pure-logic unit tests only — no database or Redis required.
    passWithNoTests: false,
  },
});
