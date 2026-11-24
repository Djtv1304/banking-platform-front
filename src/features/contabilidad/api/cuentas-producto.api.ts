import type { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'
import {
  CUENTAS_PRODUCTO_ENDPOINTS,
  asignacionesTipoSchema,
  claseSchema,
  cuentasSubproductoSchema,
  solicitudAceptadaSchema,
  type CambioAsignacion,
} from '@/features/contabilidad/api/cuentas-producto.contract'

function validar<T>(schema: z.ZodType<T>, data: unknown, status: number): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos leer las cuentas de los productos. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

export async function getClasesCuenta() {
  const { data, status } = await apiClient.get<unknown>(CUENTAS_PRODUCTO_ENDPOINTS.clases)
  return validar(claseSchema.array(), data, status)
}

export async function getAsignacionesTipo(idTipo: number) {
  const { data, status } = await apiClient.get<unknown>(CUENTAS_PRODUCTO_ENDPOINTS.tipo(idTipo))
  return validar(asignacionesTipoSchema, data, status)
}

export async function getCuentasSubproducto(idSub: number) {
  const { data, status } = await apiClient.get<unknown>(CUENTAS_PRODUCTO_ENDPOINTS.subproducto(idSub))
  return validar(cuentasSubproductoSchema, data, status)
}

/** 202: queda pendiente hasta que otra persona lo apruebe */
export async function solicitarAsignaciones(idTipo: number, cambios: CambioAsignacion[]) {
  const { data, status } = await apiClient.put<unknown>(CUENTAS_PRODUCTO_ENDPOINTS.tipo(idTipo), { cambios })
  return validar(solicitudAceptadaSchema, data, status)
}
