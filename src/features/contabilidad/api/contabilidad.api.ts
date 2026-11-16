import { ApiError, apiClient } from '@/shared/api'
import {
  CONTABILIDAD_ENDPOINTS,
  cuentaContableSchema,
  type CuentaContableCreate,
  type EstadoCuentaContable,
  type ResultadoMantenimiento,
} from '@/features/contabilidad/api/contabilidad.contract'

/** CON-03 · Todo el plan de cuentas, sin filtros: la búsqueda se hace en la SPA sobre el árbol */
export async function getCuentasContables() {
  const { data, status } = await apiClient.get<unknown>(CONTABILIDAD_ENDPOINTS.cuentas)
  const result = cuentaContableSchema.array().safeParse(data)
  if (!result.success) {
    throw new ApiError('No pudimos cargar el plan de cuentas. Inténtalo más tarde.', status, 'respuesta_invalida')
  }
  return result.data
}

/*
 * Mantenimiento (contrato propuesto, aún sin endpoint). No se lee la cuenta devuelta: tras cada
 * operación se vuelve a pedir el plan, así que basta con saber si quedó aplicada o pendiente.
 */
const resultado = (status: number): ResultadoMantenimiento => ({ pendiente: status === 202 })

export async function crearCuentaContable(body: CuentaContableCreate) {
  const { status } = await apiClient.post<unknown>(CONTABILIDAD_ENDPOINTS.cuentas, body)
  return resultado(status)
}

export async function renombrarCuentaContable(id: number, nombreCuenta: string) {
  const { status } = await apiClient.patch<unknown>(CONTABILIDAD_ENDPOINTS.cuenta(id), { nombreCuenta })
  return resultado(status)
}

export async function cambiarEstadoCuentaContable(id: number, estado: EstadoCuentaContable) {
  const { status } = await apiClient.patch<unknown>(CONTABILIDAD_ENDPOINTS.estado(id), { estado })
  return resultado(status)
}

export async function eliminarCuentaContable(id: number) {
  const { status } = await apiClient.delete(CONTABILIDAD_ENDPOINTS.cuenta(id))
  return resultado(status)
}
