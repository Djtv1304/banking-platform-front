const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ASESOR: 'Asesor',
  CAJERO: 'Cajero',
  SUPERVISOR: 'Supervisor',
  APROBADOR_CREDITO: 'Aprobador de crédito',
  CONTADOR: 'Contador',
  AUDITOR: 'Auditor',
  CUMPLIMIENTO: 'Oficial de Cumplimiento',
}

export const SIN_ROL_LABEL = 'Sin rol asignado'

/** Nombre legible de un rol del backend (ADMIN → «Administrador»). Un rol desconocido se muestra en palabras. */
export function formatRol(rol: string): string {
  const key = rol.trim().toUpperCase().replace(/-/g, '_')
  const known = ROL_LABELS[key]
  if (known) return known
  const words = key.split('_').filter(Boolean).join(' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Roles legibles separados por coma, sin repetidos; «Sin rol asignado» si no hay ninguno. */
export function formatRoles(roles: readonly string[]): string {
  const labels = [...new Set(roles.map(formatRol).filter(Boolean))]
  return labels.length > 0 ? labels.join(', ') : SIN_ROL_LABEL
}
