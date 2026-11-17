import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const backendRoot = process.env.BANKING_BACKEND_ROOT ?? fileURLToPath(new URL('../Banking-Platform/Backend', import.meta.url))
const python = process.env.BANKING_BACKEND_PYTHON ?? path.join(backendRoot, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: `"${python}" e2e/backend_lab.py`, url: 'http://127.0.0.1:18471/api/v1/productos/tipos', reuseExistingServer: false, timeout: 30000, env: { E302_LOCAL_E2E: '1', BANKING_BACKEND_ROOT: backendRoot } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 30000, env: { API_PROXY_TARGET: 'http://127.0.0.1:18471' } },
  ],
})
