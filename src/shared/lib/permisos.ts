/**
 * Permisos de escritura de WorkOS (llegan en /auth/me como `permisos`). El rol decide qué se ve;
 * el permiso, qué se cambia. Mismos slugs que el backend (core/security/permisos.py).
 */
export const PERMISOS = {
  organizacionEditar: 'organizacion:editar',
  agenciasEditar: 'agencias:editar',
  usuariosEditar: 'usuarios:editar',
  productosEditar: 'productos:editar',
  productosExportar: 'productos:exportar',
  catalogosEditar: 'catalogos:editar',
  clientesEditar: 'clientes:editar',
  clientesEstado: 'clientes:estado',
  clientesRiesgo: 'clientes:riesgo',
  cuentasAbrir: 'cuentas:abrir',
  cuentasEstado: 'cuentas:estado',
  cuentasCupos: 'cuentas:cupos',
  tarjetasEmitir: 'tarjetas:emitir',
  tarjetasEstado: 'tarjetas:estado',
  contabilidadEditar: 'contabilidad:editar',
  cajaOperar: 'caja:operar',
  cajaAutorizar: 'caja:autorizar',
  bovedaOperar: 'boveda:operar',
  bovedaArqueo: 'boveda:arqueo',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/** Solo decide qué se MUESTRA: el backend vuelve a validar el permiso en cada escritura. */
export function hasPermission(permisos: readonly string[], permiso: Permiso) {
  return permisos.includes(permiso)
}
