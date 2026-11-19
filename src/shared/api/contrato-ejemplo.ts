/**
 * E0-03 · Respuestas de ejemplo a partir del contrato OpenAPI (modo `contrato`, solo desarrollo).
 * Lo usa el plugin `e2e/contrato-simulado.ts`; la app no lo importa en producción.
 */
type Esquema = Record<string, unknown>
export interface ContratoOpenApi {
  paths?: Record<string, Record<string, { responses?: Record<string, { content?: Record<string, { schema?: Esquema }> }> }>>
  components?: { schemas?: Record<string, Esquema> }
}

const REF = '#/components/schemas/'

/** Un valor de ejemplo que cumple el esquema (tipo, enum, formato, referencias, listas). */
export function ejemplo(esquema: Esquema | undefined, componentes: Record<string, Esquema> = {}, profundidad = 0): unknown {
  if (!esquema || profundidad > 8) return null
  const ref = esquema.$ref
  if (typeof ref === 'string' && ref.startsWith(REF)) return ejemplo(componentes[ref.slice(REF.length)], componentes, profundidad + 1)
  if ('example' in esquema) return esquema.example
  if (Array.isArray(esquema.examples) && esquema.examples.length) return esquema.examples[0]
  if (Array.isArray(esquema.enum) && esquema.enum.length) return esquema.enum[0]
  if ('const' in esquema) return esquema.const
  for (const clave of ['anyOf', 'oneOf', 'allOf'] as const) {
    const opciones = esquema[clave]
    if (Array.isArray(opciones)) {
      const util = (opciones as Esquema[]).find((o) => o.type !== 'null') ?? (opciones[0] as Esquema)
      if (clave !== 'allOf') return ejemplo(util, componentes, profundidad + 1)
      return Object.assign({}, ...(opciones as Esquema[]).map((o) => ejemplo(o, componentes, profundidad + 1) as object))
    }
  }
  const tipo = Array.isArray(esquema.type) ? (esquema.type as string[]).find((t) => t !== 'null') : esquema.type
  switch (tipo) {
    case 'object': {
      const propiedades = (esquema.properties ?? {}) as Record<string, Esquema>
      return Object.fromEntries(Object.entries(propiedades).map(([k, v]) => [k, ejemplo(v, componentes, profundidad + 1)]))
    }
    case 'array':
      return [ejemplo(esquema.items as Esquema, componentes, profundidad + 1)]
    case 'integer':
      return typeof esquema.minimum === 'number' ? esquema.minimum : 1
    case 'number':
      return typeof esquema.minimum === 'number' ? esquema.minimum : 1.0
    case 'boolean':
      return true
    case 'string':
      switch (esquema.format) {
        case 'date':
          return '2026-01-15'
        case 'date-time':
          return '2026-01-15T10:00:00Z'
        case 'uuid':
          return '00000000-0000-4000-8000-000000000000'
        case 'email':
          return 'persona@example.com'
        default:
          return 'texto'
      }
    default:
      return null
  }
}

/** Ruta del contrato (`/api/v1/cuentas/{idCuenta}`) como expresión regular. */
export function patronDeRuta(ruta: string): RegExp {
  const escapada = ruta.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')
  return new RegExp(`^${escapada}$`)
}

/** Respuesta simulada para `metodo ruta` según los contratos: código y cuerpo, o null si no está en el contrato. */
export function respuestaSimulada(contratos: ContratoOpenApi[], metodo: string, ruta: string): { status: number; cuerpo: unknown } | null {
  for (const contrato of contratos) {
    for (const [plantilla, operaciones] of Object.entries(contrato.paths ?? {})) {
      const operacion = operaciones[metodo.toLowerCase()]
      if (!operacion || !patronDeRuta(plantilla).test(ruta)) continue
      const exitos = Object.keys(operacion.responses ?? {}).filter((c) => c.startsWith('2')).sort()
      const codigo = exitos[0] ?? '200'
      const esquema = operacion.responses?.[codigo]?.content?.['application/json']?.schema
      return { status: Number(codigo), cuerpo: esquema ? ejemplo(esquema, contrato.components?.schemas ?? {}) : null }
    }
  }
  return null
}
