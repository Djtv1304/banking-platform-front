import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

import { respuestaSimulada, type ContratoOpenApi } from '../src/shared/api/contrato-ejemplo.ts'

/**
 * E0-03 · Modo `contrato` (`npm run dev:contrato`): responde cada /api/v1/* con un ejemplo generado desde el contrato
 * confirmado (carpeta `contrato/`, copia de Backend/contract/ con `npm run contrato:copiar`). Sin backend ni red.
 * Una ruta que no está en el contrato responde 501 con su nombre: así se nota la diferencia.
 */
export function contratoSimulado(carpeta = 'contrato'): Plugin {
  const contratos: ContratoOpenApi[] = readdirSync(carpeta)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(carpeta, f), 'utf8')) as ContratoOpenApi)
  return {
    name: 'contrato-simulado',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ruta = (req.url ?? '').split('?')[0]
        if (!ruta.startsWith('/api/v1/')) return next()
        const simulada = respuestaSimulada(contratos, req.method ?? 'GET', ruta)
        res.setHeader('Content-Type', 'application/json')
        if (!simulada) {
          res.statusCode = 501
          res.end(JSON.stringify({ title: 'Ruta fuera del contrato', status: 501, code: 'FUERA_DEL_CONTRATO', detail: `${req.method} ${ruta}` }))
          return
        }
        res.statusCode = simulada.status
        res.end(simulada.cuerpo === null ? '' : JSON.stringify(simulada.cuerpo))
      })
    },
  }
}
