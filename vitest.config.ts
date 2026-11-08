import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pruebas de lógica pura (sin DOM). Si algún día hacen falta pruebas de componentes,
// se agrega el plugin de React y `environment: 'jsdom'` aquí.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    // Los worktrees viven dentro del clon (.claude/worktrees): sin esto, `npm test` en el clon
    // principal correría también las pruebas de todas las ramas abiertas
    exclude: ['**/node_modules/**', '.claude/**', 'dist/**'],
    environment: 'node',
  },
})
