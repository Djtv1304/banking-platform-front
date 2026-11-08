import { ApiError } from '@/shared/api'
import type { CambiarEstadoCuentaRequest, Cuenta } from '@/features/cuenta/api/cuenta.contract'
import { ACCIONES_CUENTA, puedeCerrarse } from '@/features/cuenta/lib/estados'

/*
 * TODO(API): reemplazar esta simulación en memoria por el backend, por ejemplo:
 *   GET   /api/v1/clientes/{idCliente}/cuentas      → apiClient.get<Cuenta[]>(…)
 *   PATCH /api/v1/cuentas/{idCuenta}/estado         → apiClient.patch<Cuenta>(…, request)
 * Los hooks y componentes no cambian: solo el cuerpo de estas funciones.
 */

const cuentas: Cuenta[] = [
  { idCuenta: 1, idCliente: 1, numeroCuenta: '2201004521', tipoCuenta: 'AHORROS', saldoDisponible: 3250.75, estado: 'ACTIVA', fechaApertura: '2024-03-12', motivoEstado: null, fechaEstado: null },
  { idCuenta: 2, idCliente: 1, numeroCuenta: '2201007788', tipoCuenta: 'AHORRO_PROGRAMADO', saldoDisponible: 1200, estado: 'BLOQUEADA', fechaApertura: '2025-01-08', motivoEstado: 'Sospecha de fraude', fechaEstado: '2026-10-28T09:15:00' },
  { idCuenta: 3, idCliente: 1, numeroCuenta: '2201009310', tipoCuenta: 'AHORROS', saldoDisponible: 0, estado: 'INACTIVA', fechaApertura: '2023-06-20', motivoEstado: 'Falta de movimientos', fechaEstado: '2026-02-01T08:00:00' },
  { idCuenta: 4, idCliente: 2, numeroCuenta: '3301000145', tipoCuenta: 'CORRIENTE', saldoDisponible: 48210.4, estado: 'ACTIVA', fechaApertura: '2022-11-03', motivoEstado: null, fechaEstado: null },
  { idCuenta: 5, idCliente: 2, numeroCuenta: '2201001002', tipoCuenta: 'AHORROS', saldoDisponible: 0, estado: 'CERRADA', fechaApertura: '2021-04-15', motivoEstado: 'Solicitud del cliente', fechaEstado: '2025-08-30T16:40:00' },
  { idCuenta: 6, idCliente: 3, numeroCuenta: '2201012876', tipoCuenta: 'AHORROS', saldoDisponible: 640.2, estado: 'ACTIVA', fechaApertura: '2026-05-02', motivoEstado: null, fechaEstado: null },
]

const simularRed = <T,>(valor: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(valor)), 450))

export async function getCuentasCliente(idCliente: number): Promise<Cuenta[]> {
  return simularRed(cuentas.filter((cuenta) => cuenta.idCliente === idCliente))
}

export async function cambiarEstadoCuenta(idCuenta: number, request: CambiarEstadoCuentaRequest): Promise<Cuenta> {
  const cuenta = cuentas.find((item) => item.idCuenta === idCuenta)
  if (!cuenta) throw new ApiError('La cuenta no existe.', 404, 'CUENTA_NO_ENCONTRADA')

  const accion = ACCIONES_CUENTA[request.accion]
  if (!accion.desde.includes(cuenta.estado)) {
    throw new ApiError('La cuenta cambió de estado. Actualiza la página e inténtalo de nuevo.', 409, 'TRANSICION_INVALIDA')
  }
  if (request.accion === 'CERRAR' && !puedeCerrarse(cuenta)) {
    throw new ApiError('La cuenta tiene saldo. Retira o transfiere el saldo antes de cerrarla.', 409, 'CUENTA_CON_SALDO')
  }

  cuenta.estado = accion.destino
  cuenta.motivoEstado = accion.motivos.find((motivo) => motivo.value === request.motivo)?.label ?? request.motivo
  cuenta.fechaEstado = new Date().toISOString()
  return simularRed(cuenta)
}
