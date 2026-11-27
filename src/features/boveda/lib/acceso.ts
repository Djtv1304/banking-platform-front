/*
 * Roles de cada operación de bóveda.
 *
 * La agencia operativa y la identidad también se validan en el servidor.
 */
export const BOVEDA_ROLES = {
  /** BOV-01 */
  listar: ['CAJERO', 'SUPERVISOR', 'CONTADOR', 'ADMIN'],
  /** BOV-02 */
  consultar: ['CAJERO', 'SUPERVISOR', 'CONTADOR', 'ADMIN'],
  /** BOV-03 */
  movimientos: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** BOV-05 */
  registrarArqueo: ['SUPERVISOR'],
  aprobarArqueo: ['SUPERVISOR', 'ADMIN'],
  resolverNovedad: ['SUPERVISOR'],
  /** BOV-07 */
  arqueos: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** SMV-01 */
  solicitarMovimiento: ['CAJERO', 'SUPERVISOR'],
  /** SMV-02 y SMV-03 */
  solicitudes: ['CAJERO', 'SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** SMV-04 y SMV-05 */
  resolverSolicitud: ['SUPERVISOR'],
  /** SMV-06 */
  cancelarSolicitud: ['CAJERO', 'SUPERVISOR'],
  /** Menú y rutas: cualquiera que tenga al menos una operación */
  acceso: ['CAJERO', 'SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
} as const satisfies Record<string, readonly string[]>

export type OperacionBoveda = Exclude<keyof typeof BOVEDA_ROLES, 'acceso'>

export type AccesoBoveda = Record<OperacionBoveda, boolean>

const OPERACIONES = Object.keys(BOVEDA_ROLES).filter((clave): clave is OperacionBoveda => clave !== 'acceso')

/** Qué operaciones puede ver el usuario según sus roles */
export function accesoBoveda(roles: readonly string[]): AccesoBoveda {
  const propios = roles.map((rol) => rol.trim().toUpperCase())
  const puede = (operacion: OperacionBoveda) =>
    propios.some((rol) => (BOVEDA_ROLES[operacion] as readonly string[]).includes(rol))
  return Object.fromEntries(OPERACIONES.map((operacion) => [operacion, puede(operacion)])) as AccesoBoveda
}
