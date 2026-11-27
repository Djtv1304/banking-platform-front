/*
 * Roles de la ventanilla. La jornada propia (CAJ-04) y su apertura (CAJ-03) son solo del CAJERO en el
 * backend; la historia habla de permisos `CAJ-*`, pero develop valida por rol.
 *
 * ⚠️ Solo decide qué se MUESTRA: el backend valida el rol en cada endpoint.
 */
export const CAJA_ROLES = {
  /** CAJ-03, CAJ-04, CAJ-08 y CAJ-12 sobre la jornada propia */
  ventanilla: ['CAJERO'],
} as const satisfies Record<string, readonly string[]>
