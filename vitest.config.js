import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/rules.test.js', 'node_modules/**', 'functions/**'],
    environment: 'jsdom'
  }
});
