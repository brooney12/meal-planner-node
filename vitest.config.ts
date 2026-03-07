import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 70,
        functions: 70,
      },
    },
  },
})
