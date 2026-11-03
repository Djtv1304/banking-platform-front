import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      }
    },
    server: {
      // SPA y API en el mismo origen (http://localhost:5173/api/...): la cookie de sesión del backend
      // es de primera parte. El Redirect URI de WorkOS en desarrollo es http://localhost:5173/api/v1/auth/callback
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://127.0.0.1:8471',
      },
    },
  }
})
