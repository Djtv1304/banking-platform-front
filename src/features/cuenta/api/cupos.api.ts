import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import { pageSchema } from '@/features/cuenta/api/cuentas.contract'
import {
  CUPOS_ENDPOINTS,
  cupoEfectivoSchema,
  cupoHistorialSchema,
  type CupoUpdate,
} from '@/features/cuenta/api/cupos.contract'
import { PAGE_SIZE } from '@/features/cuenta/lib/filtros'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Inténtalo más tarde.'

/** Más reciente primero (también es el orden por defecto del backend) */
const ORDEN_HISTORIAL = 'fechaModificacion,desc'

/** Si la forma no es la esperada (p. ej. HTML sin backend) se rechaza en vez de romper la pantalla */
function validar<T extends z.ZodType>(schema: T, data: unknown, status: number): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

/** CTA-07 · Cuenta inexistente → 404 CUENTA_NO_ENCONTRADA */
export async function getCupos(idCuenta: number) {
  const { data, status } = await apiClient.get<unknown>(CUPOS_ENDPOINTS.cupos(idCuenta))
  return validar(cupoEfectivoSchema.array(), data, status)
}

/** CTA-08 · Devuelve el cupo que rige después del cambio */
export async function actualizarCupo(idCuenta: number, idCanal: number, body: CupoUpdate) {
  const { data, status } = await apiClient.put<unknown>(CUPOS_ENDPOINTS.cupo(idCuenta, idCanal), body)
  return validar(cupoEfectivoSchema, data, status)
}

/** CTA-09 · Página de 20 cambios; sin personalizado devuelve una lista vacía */
export async function getHistorialCupo(idCuenta: number, idCanal: number, page: number) {
  const { data, status } = await apiClient.get<unknown>(CUPOS_ENDPOINTS.historial(idCuenta, idCanal), {
    params: { page: String(page), pageSize: String(PAGE_SIZE), sort: ORDEN_HISTORIAL },
  })
  return validar(pageSchema(cupoHistorialSchema), data, status)
}
