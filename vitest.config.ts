import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pruebas de lógica y del proxy HTTP (sin DOM)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
