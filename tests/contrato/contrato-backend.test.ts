import { describe, expect, it } from 'vitest'

/*
 * Contrato front ↔ backend: cada ruta declarada en `src/features/<m>/api/*.contract.ts`
 * (los objetos `*_ENDPOINTS`) tiene que existir en el OpenAPI del backend.
 *
 * - Sin `BACKEND_OPENAPI_URL` sólo corre la parte local (que se encuentren las rutas y tengan forma válida).
 * - Con `BACKEND_OPENAPI_URL` descarga el OpenAPI y compara segmento a segmento. Si el backend no
 *   responde (p. ej. Azure dormido), avisa y omite la comparación: no es culpa del PR.
 *
 *   BACKEND_OPENAPI_URL=https://<backend>/api/openapi.json npm run contrato
 */

type Endpoint = string | ((...parametros: string[]) => string)

interface RutaDelFront {
  origen: string
  ruta: string
}

interface OpenApi {
  paths: Record<string, unknown>
}

/** Valor con el que se llaman las rutas con parámetros: equivale a un `{param}` del OpenAPI */
const PARAMETRO = '__parametro__'

const modulos = import.meta.glob<Record<string, unknown>>('/src/features/*/api/*.contract.ts', { eager: true })

function esEndpoint(valor: unknown): valor is Endpoint {
  return typeof valor === 'string' || typeof valor === 'function'
}

function rutasDelFront(): RutaDelFront[] {
  const rutas: RutaDelFront[] = []
  for (const [archivo, modulo] of Object.entries(modulos)) {
    for (const [exportado, valor] of Object.entries(modulo)) {
      if (!exportado.endsWith('_ENDPOINTS') || typeof valor !== 'object' || valor === null) continue
      for (const [nombre, endpoint] of Object.entries(valor)) {
        if (!esEndpoint(endpoint)) continue
        const ruta =
          typeof endpoint === 'function' ? endpoint(...Array<string>(endpoint.length).fill(PARAMETRO)) : endpoint
        rutas.push({ origen: `${archivo.replace(/^\//, '')} · ${exportado}.${nombre}`, ruta: ruta.split('?')[0] })
      }
    }
  }
  return rutas
}

function segmentos(ruta: string) {
  return ruta.replace(/\/+$/, '').split('/').filter(Boolean)
}

/** Un segmento literal sólo empareja con el mismo literal; el marcador, sólo con un `{param}` */
function coincide(rutaFront: string, rutaBackend: string) {
  const front = segmentos(rutaFront)
  const backend = segmentos(rutaBackend)
  if (front.length !== backend.length) return false
  return front.every((segmento, i) => {
    const esParametro = /^\{.+\}$/.test(backend[i])
    return segmento === PARAMETRO ? esParametro : segmento === backend[i]
  })
}

async function descargarOpenApi(url: string): Promise<OpenApi | undefined> {
  // Dos intentos: el plan gratuito de Azure tarda en despertar
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(45_000) })
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const cuerpo: unknown = await respuesta.json()
      if (typeof cuerpo === 'object' && cuerpo !== null && 'paths' in cuerpo) return cuerpo as OpenApi
      throw new Error('la respuesta no es un OpenAPI (no trae `paths`)')
    } catch (error) {
      console.warn(`[contrato] intento ${intento}: no se pudo leer ${url}: ${String(error)}`)
    }
  }
  return undefined
}

const URL_OPENAPI = process.env.BACKEND_OPENAPI_URL
const openApi = URL_OPENAPI ? await descargarOpenApi(URL_OPENAPI) : undefined
const rutas = rutasDelFront()

describe('contrato del front (local)', () => {
  it('encuentra los contratos de las features', () => {
    expect(Object.keys(modulos).length).toBeGreaterThan(0)
    expect(rutas.length).toBeGreaterThan(0)
  })

  it('todas las rutas son relativas al mismo origen y versionadas (/api/v1/...)', () => {
    const malas = rutas.filter(({ ruta }) => !ruta.startsWith('/api/v1/'))
    expect(malas, 'rutas que no empiezan por /api/v1/').toEqual([])
  })
})

describe.skipIf(!openApi)('contrato con el backend (OpenAPI)', () => {
  it('cada ruta del front existe en el backend', () => {
    const rutasBackend = Object.keys(openApi?.paths ?? {})
    const faltantes = rutas
      .filter(({ ruta }) => !rutasBackend.some((rutaBackend) => coincide(ruta, rutaBackend)))
      .map(({ origen, ruta }) => `${ruta.replaceAll(PARAMETRO, '{…}')}  (${origen})`)
    expect(faltantes, `rutas del front que no están en ${URL_OPENAPI}`).toEqual([])
  })
})
