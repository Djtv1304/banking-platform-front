// E0-03 · Contrato de la API en el frontend (sin activar en el CI).
//
//   npm run contrato:copiar   copia Backend/contract/*.json a contrato/ (CONTRATO_DIR o ../Banking-Platform/Backend/contract)
//   npm run contrato:tipos    genera src/shared/api/contrato/<modulo>.d.ts con openapi-typescript (versión fija)
//
// Un cambio incompatible del contrato hace fallar `npm run typecheck` en las pantallas que usan esos tipos.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const OPENAPI_TYPESCRIPT = 'openapi-typescript@7.13.0'
const accion = process.argv[2]

if (accion === 'copiar') {
  const origen = resolve(process.env.CONTRATO_DIR ?? '../Banking-Platform/Backend/contract')
  rmSync('contrato', { recursive: true, force: true })
  mkdirSync('contrato', { recursive: true })
  const archivos = readdirSync(origen).filter((f) => f.endsWith('.json'))
  for (const f of archivos) copyFileSync(join(origen, f), join('contrato', f))
  console.log(`contrato: ${archivos.length} módulos copiados desde ${origen}`)
} else if (accion === 'tipos') {
  const destino = 'src/shared/api/contrato'
  mkdirSync(destino, { recursive: true })
  for (const f of readdirSync('contrato').filter((x) => x.endsWith('.json'))) {
    const salida = join(destino, f.replace(/\.json$/, '.d.ts'))
    execFileSync('npx', ['--yes', OPENAPI_TYPESCRIPT, join('contrato', f), '-o', salida], { stdio: 'inherit', shell: process.platform === 'win32' })
  }
} else {
  console.error('uso: node scripts/contrato.mjs copiar|tipos')
  process.exit(2)
}
