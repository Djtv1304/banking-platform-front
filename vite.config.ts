import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { agenciasSimuladas } from './e2e/agencias-simuladas.ts'
import { contratoSimulado } from './e2e/contrato-simulado.ts'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const simulado = command === 'serve' && mode === 'simulado'
  // E0-03 · respuestas generadas desde el contrato (sin activar: solo con `npm run dev:contrato`)
  const contrato = command === 'serve' && mode === 'contrato'

  return {
    plugins: [react(), tailwindcss(), ...(simulado ? [agenciasSimuladas()] : []), ...(contrato ? [contratoSimulado()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      }
    },
    server: {
      // SPA y API en el mismo origen (http://localhost:5173/api/...): la cookie de sesión del backend
      // es de primera parte. El Redirect URI de WorkOS en desarrollo es http://localhost:5173/api/v1/auth/callback
      proxy: simulado || contrato ? undefined : {
        '/api': env.API_PROXY_TARGET || 'http://127.0.0.1:8471',
      },
    },
  }
})
