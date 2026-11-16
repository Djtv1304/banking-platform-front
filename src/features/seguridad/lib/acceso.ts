/** Vista informativa de seguridad; coincide con la gestión de usuarios de AUT-05..09. */
export const ROLES_CONSULTA_ROLES = ['ADMIN'] as const

export interface SeccionAccesoRol {
  titulo: string
  opciones: { titulo: string; enPreparacion: boolean }[]
}
