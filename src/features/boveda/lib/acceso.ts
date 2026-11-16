/*
 * Roles de cada operación de bóveda. ADMIN entra a todas en la UI aunque el backend no lo liste
 * (BOV-03 a BOV-06): si lo rechaza, la pantalla muestra el 403 como «Tu rol no tiene permiso».
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
  /** BOV-04 */
  registrarMovimiento: ['SUPERVISOR', 'ADMIN'],
  /** BOV-05 */
  registrarArqueo: ['SUPERVISOR', 'AUDITOR', 'ADMIN'],
  /** BOV-06 */
  aprobarArqueo: ['SUPERVISOR', 'ADMIN'],
  /** Menú y rutas: cualquiera que tenga al menos una operación */
  acceso: ['SUPERVISOR', 'CONTADOR', 'AUDITOR', 'ADMIN'],
} as const satisfies Record<string, readonly string[]>

export type OperacionBoveda = Exclude<keyof typeof BOVEDA_ROLES, 'acceso'>

export type AccesoBoveda = Record<OperacionBoveda, boolean>

/** Qué operaciones puede ver el usuario según sus roles */
export function accesoBoveda(roles: readonly string[]): AccesoBoveda {
  const propios = roles.map((rol) => rol.trim().toUpperCase())
  const puede = (operacion: OperacionBoveda) =>
    propios.some((rol) => (BOVEDA_ROLES[operacion] as readonly string[]).includes(rol))
  return {
    listar: puede('listar'),
    consultar: puede('consultar'),
    movimientos: puede('movimientos'),
    registrarMovimiento: puede('registrarMovimiento'),
    registrarArqueo: puede('registrarArqueo'),
    aprobarArqueo: puede('aprobarArqueo'),
  }
}
