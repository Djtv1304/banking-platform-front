/*
 * Contrato de cuentas del cliente y cambio de estado (historia A-03).
 * TODO(API): ajustar nombres y valores a la respuesta real cuando se publique el contrato.
 */

export type EstadoCuenta = 'ACTIVA' | 'BLOQUEADA' | 'INACTIVA' | 'CERRADA'
export type AccionCuenta = 'BLOQUEAR' | 'INACTIVAR' | 'REACTIVAR' | 'CERRAR'
export type TipoCuenta = 'AHORROS' | 'CORRIENTE' | 'AHORRO_PROGRAMADO'

export interface Cuenta {
  idCuenta: number
  idCliente: number
  numeroCuenta: string
  tipoCuenta: TipoCuenta
  saldoDisponible: number
  estado: EstadoCuenta
  fechaApertura: string
  /** Motivo y fecha del último cambio de estado (null mientras siga activa desde su apertura) */
  motivoEstado: string | null
  fechaEstado: string | null
}

export interface CambiarEstadoCuentaRequest {
  accion: AccionCuenta
  motivo: string
  observacion: string | null
}
