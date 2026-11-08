import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pruebas de lógica pura (sin DOM)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
