import { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'

/*
 * E5-05 · Revelación auditada de datos sensibles (ASVS 16.2.1), con MFA de la cuenta del usuario.
 *
 * - POST /clientes/{id}/revelacion/desafio (sin body) → `{ idDesafio, expiraEn }`.
 *   409 MFA_NO_CONFIGURADO, 503 MFA_NO_DISPONIBLE.
 * - POST /clientes/{id}/revelacion `{ campos, idDesafio, codigo }` → solo los campos pedidos; el resto null.
 *   403 MFA_INVALIDO (hay que pedir otro desafío), 429 con más de 5 por minuto.
 *
 * Roles: ASESOR, SUPERVISOR y ADMIN (función `clientes.verSensible`). El backend audita cada intento.
 * El resultado nunca pasa por la caché de TanStack Query ni por el almacenamiento del navegador:
 * quien lo pide lo guarda solo en el estado de su componente.
 */

export const CAMPOS_REVELABLES = ['identificacion', 'email', 'telefonoCelular', 'telefonoConvencional', 'correosSecundarios'] as const
export type CampoRevelable = (typeof CAMPOS_REVELABLES)[number]

const base = (idCliente: number) => `/api/v1/clientes/${idCliente}/revelacion`

const desafioSchema = z.object({ idDesafio: z.string().min(1), expiraEn: z.string().nullable() })
export type Desafio = z.infer<typeof desafioSchema>

export const revelacionBodySchema = z.strictObject({
  campos: z.array(z.enum(CAMPOS_REVELABLES)).min(1).max(5)
    .refine((campos) => new Set(campos).size === campos.length, 'No repitas campos.'),
  idDesafio: z.string().min(1),
  codigo: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos.'),
})
export type RevelacionBody = z.input<typeof revelacionBodySchema>

const texto = z.string().nullable().default(null)
const revelacionSchema = z.object({
  identificacion: texto,
  email: texto,
  telefonoCelular: texto,
  telefonoConvencional: texto,
  correosSecundarios: z.array(z.string()).nullable().default(null),
})
export type Revelacion = z.infer<typeof revelacionSchema>

function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const resultado = schema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

export async function pedirDesafioRevelacion(idCliente: number) {
  const { data, status } = await apiClient.post<unknown>(`${base(idCliente)}/desafio`)
  return validar(desafioSchema, data, status)
}

export async function revelarDatos(idCliente: number, body: RevelacionBody) {
  const { data, status } = await apiClient.post<unknown>(base(idCliente), revelacionBodySchema.parse(body))
  return validar(revelacionSchema, data, status)
}

/** Mensaje para el usuario; `nuevoCodigo` indica que el desafío ya no sirve y hay que pedir otro */
export function errorRevelacion(error: unknown): { mensaje: string; nuevoCodigo: boolean } {
  const api = error instanceof ApiError ? error : null
  if (api?.code === 'MFA_NO_CONFIGURADO') {
    return { mensaje: 'Tu cuenta no tiene una app de autenticación configurada. Configúrala en tu cuenta para poder ver datos completos.', nuevoCodigo: false }
  }
  if (api?.code === 'MFA_INVALIDO') {
    return { mensaje: 'El código no es válido o ya expiró. Pide un código nuevo e inténtalo otra vez.', nuevoCodigo: true }
  }
  if (api?.status === 429) {
    return { mensaje: 'Hiciste demasiados intentos. Espera un minuto antes de volver a intentarlo.', nuevoCodigo: false }
  }
  if (api?.code === 'MFA_NO_DISPONIBLE' || api?.status === 503) {
    return { mensaje: 'La verificación en dos pasos no está disponible en este momento. Inténtalo más tarde.', nuevoCodigo: false }
  }
  return { mensaje: error instanceof Error ? error.message : 'No pudimos mostrar el dato. Inténtalo nuevamente.', nuevoCodigo: false }
}
