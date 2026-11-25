import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const backendRoot = process.env.BANKING_BACKEND_ROOT ?? fileURLToPath(new URL('../Banking-Platform/Backend', import.meta.url))
const python = process.env.BANKING_BACKEND_PYTHON ?? path.join(backendRoot, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')

const simulado = process.env.E010_SIMULADO === '1'
const usuariosSimulados = process.env.E104_SIMULADO === '1'
const reglasSimuladas = process.env.E403_SIMULADO === '1'
const tarjetasSimuladas = process.env.E610_SIMULADO === '1'
const baseURL = tarjetasSimuladas ? 'http://127.0.0.1:5181' : reglasSimuladas ? 'http://127.0.0.1:5177' : usuariosSimulados ? 'http://127.0.0.1:5176' : simulado ? 'http://127.0.0.1:5175' : 'http://127.0.0.1:5174'

export default defineConfig({
  testDir: './e2e',
  testMatch: tarjetasSimuladas ? '**/tarjeta-debito.spec.ts' : reglasSimuladas ? '**/plantillas-contables.spec.ts' : usuariosSimulados ? '**/usuarios.spec.ts' : simulado ? '**/agencias.spec.ts' : '**/*.spec.ts',
  testIgnore: usuariosSimulados || simulado ? [] : ['**/agencias.spec.ts', '**/usuarios.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL, channel: 'chrome', headless: true, trace: 'retain-on-failure',
    launchOptions: process.env.E104_VISUAL === '1' ? { slowMo: 1_000 } : undefined,
  },
  webServer: tarjetasSimuladas ? {
    command: 'npm run dev -- --host 127.0.0.1 --port 5181 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  } : reglasSimuladas ? {
    command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  } : usuariosSimulados ? {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  } : simulado ? {
    command: 'npm run dev -- --mode simulado --host 127.0.0.1 --port 5175 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  } : [
    { command: `"${python}" e2e/backend_lab.py`, url: 'http://127.0.0.1:18471/api/v1/productos/tipos', reuseExistingServer: false, timeout: 30000, env: { E302_LOCAL_E2E: '1', BANKING_BACKEND_ROOT: backendRoot } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 30000, env: { API_PROXY_TARGET: 'http://127.0.0.1:18471' } },
  ],
})
