/*
 * Roles de cada operación de bóveda.
 *
 * (BOV-07); se usan los mismos roles que consultan movimientos. Si alguno lo rechaza, la pantalla
 * muestra el 403 como «Tu rol no tiene permiso». Crear y cancelar solicitudes queda en SUPERVISOR y
 * ADMIN hasta que se defina el rol solicitante.
 *
 * ⚠️ Solo decide qué se MUESTRA: el backend valida el permiso en cada endpoint.
 */
export const BOVEDA_ROLES = {
  /** BOV-01 */
  listar: ['SUPERVISOR', 'CONTADOR', 'ADMIN'],
  /** BOV-02 */
  consultar: ['SUPERVISOR', 'CONTADOR', 'ADMIN'],
  /** BOV-03 */
  movimientos: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** BOV-05 */
  registrarArqueo: ['SUPERVISOR', 'AUDITOR', 'ADMIN'],
  /** BOV-06 */
  aprobarArqueo: ['SUPERVISOR', 'ADMIN'],
  /** BOV-07 */
  arqueos: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** SMV-01 */
  solicitarMovimiento: ['SUPERVISOR', 'ADMIN'],
  /** SMV-02 y SMV-03 */
  solicitudes: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
  /** SMV-04 y SMV-05 */
  resolverSolicitud: ['SUPERVISOR', 'ADMIN'],
  /** SMV-06 */
  cancelarSolicitud: ['SUPERVISOR', 'ADMIN'],
  /** Menú y rutas: cualquiera que tenga al menos una operación */
  acceso: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
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
