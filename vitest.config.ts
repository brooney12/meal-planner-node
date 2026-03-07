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
        statements: 55,
        lines: 55,
        branches: 80,
        functions: 65,
      },
    },
  },
})
