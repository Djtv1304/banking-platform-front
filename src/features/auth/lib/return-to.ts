/**
 * Solo se aceptan rutas internas de la SPA ("/algo"). Evita redirecciones abiertas del tipo
 * `?return_to=https://sitio-malicioso.com` o `//sitio-malicioso.com`.
 * El backend debe aplicar la misma validación antes de redirigir.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  if (value === '/login' || value.startsWith('/login?')) return undefined
  return value
}

/**
 * Sólo la ruta, sin query ni hash. Lo que se guarda en el navegador (E0-07, ASVS 14.3.3) no debe
 * arrastrar filtros de búsqueda que mañana podrían llevar una cédula o un nombre.
 */
export function soloRuta(value: string): string {
  return value.split(/[?#]/, 1)[0]
}
