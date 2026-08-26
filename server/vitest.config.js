import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use a separate test database
    env: {
      NODE_ENV: 'test',
    },
    // Increase timeout for DB operations
    testTimeout: 15000,
  },
});
