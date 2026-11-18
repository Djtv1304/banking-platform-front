import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'

const version = z.string().regex(/^[a-f0-9]{64}$/)
const id = z.string().regex(/^[a-z][a-zA-Z0-9.]{0,79}$/)
const funcionSchema = z.object({
  id, nombre: z.string(), modulo: z.string(), rutas: z.array(z.string()),
  rolesIniciales: z.array(z.string()), delegable: z.boolean(),
  motivoProteccion: z.string().nullable(), dependencias: z.array(id),
})
export const configuracionFuncionesSchema = z.object({
  version, activa: z.boolean(), modelo: z.literal('FUNCIONES_POR_ROL'),
  roles: z.array(z.string()).min(1), funciones: z.array(funcionSchema).min(1),
  ajustes: z.array(z.object({ funcion: id, rol: z.string(), permitido: z.boolean() })),
}).superRefine((config, context) => {
  const ids = new Set(config.funciones.map((f) => f.id))
  const claves = config.ajustes.map((a) => `${a.funcion}|${a.rol}`)
  if (ids.size !== config.funciones.length || new Set(claves).size !== claves.length
      || config.ajustes.some((a) => !ids.has(a.funcion) || !config.roles.includes(a.rol))) {
    context.addIssue({ code: 'custom', message: 'Catálogo de funciones inconsistente.' })
  }
})
const guardadoSchema = configuracionFuncionesSchema.safeExtend({
  estado: z.literal('GUARDADO'), cambiosAplicados: z.number().int().nonnegative(),
})

export type ConfiguracionFunciones = z.infer<typeof configuracionFuncionesSchema>
export type Funcion = ConfiguracionFunciones['funciones'][number]
export type ValorAjuste = boolean | null
export interface CambioFuncion { funcion: string; rol: string; permitido: ValorAjuste }
export interface GuardarFunciones { version: string; motivo: string; cambios: CambioFuncion[] }
export const CONFIGURACION_FUNCIONES_URL = '/api/v1/seguridad/accesos/configuracion'

export async function consultarFunciones(signal?: AbortSignal) {
  const respuesta = await apiClient.get<unknown>(CONFIGURACION_FUNCIONES_URL, { signal })
  const resultado = configuracionFuncionesSchema.safeParse(respuesta.data)
  if (respuesta.status !== 200 || !resultado.success) {
    throw new ApiError('No pudimos leer el catálogo de funciones. Tu borrador se conserva.', respuesta.status, 'respuesta_invalida')
  }
  return resultado.data
}

export async function guardarFunciones(body: GuardarFunciones) {
  const respuesta = await apiClient.patch<unknown>(CONFIGURACION_FUNCIONES_URL, body)
  const resultado = guardadoSchema.safeParse(respuesta.data)
  if (respuesta.status !== 200 || !resultado.success) {
    throw new ApiError('No pudimos confirmar el guardado. Verifica la configuración antes de reintentar.', respuesta.status, 'resultado_no_confirmado')
  }
  return resultado.data
}
