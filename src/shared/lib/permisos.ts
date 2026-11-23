/**
 * Acciones que la UI muestra u oculta (consultar productos y escrituras). Mismo criterio que el backend
 * (core/security/permisos.py): solo productos (prd-) y contabilidad (con-) tienen un permiso
 * general de WorkOS (llega en /auth/me como `permisos`); el resto depende del rol
 * (require_roles). Un permiso nuevo se acuerda antes de crearlo en WorkOS.
 */
type Regla = { readonly permiso: string } | { readonly roles: readonly string[] }

const ESCRITURAS = {
  organizacionEditar: { roles: ['ADMIN'] },
  organizacionExportar: { permiso: 'org-exportar' },
  agenciasEditar: { roles: ['ADMIN'] },
  usuariosEditar: { roles: ['ADMIN'] },
  productosConsultar: { permiso: 'prd-consultar' },
  productosEditar: { permiso: 'prd-editar' },
  productosExportar: { permiso: 'prd-exportar' },
  catalogosEditar: { roles: ['ADMIN'] },
  clientesEditar: { roles: ['ASESOR', 'ADMIN'] },
  clientesEstado: { roles: ['ASESOR', 'SUPERVISOR', 'ADMIN'] },
  clientesRiesgo: { roles: ['ASESOR', 'SUPERVISOR', 'ADMIN'] },
  cuentasAbrir: { roles: ['ASESOR', 'ADMIN'] },
  cuentasEstado: { roles: ['ASESOR', 'SUPERVISOR', 'ADMIN'] },
  cuentasCupos: { roles: ['SUPERVISOR', 'ADMIN'] },
  tarjetasEmitir: { roles: ['ASESOR', 'ADMIN'] },
  tarjetasEstado: { roles: ['ASESOR', 'SUPERVISOR', 'ADMIN'] },
  contabilidadEditar: { roles: ['CONTADOR'] },
  plantillasEditar: { permiso: 'con-plantilla-editar' },
  cajaOperar: { roles: ['CAJERO'] },
  cajaAutorizar: { roles: ['SUPERVISOR'] },
  bovedaOperar: { roles: ['SUPERVISOR', 'ADMIN'] },
  bovedaArqueo: { roles: ['SUPERVISOR', 'AUDITOR', 'ADMIN'] },
} as const satisfies Record<string, Regla>

export type Permiso = keyof typeof ESCRITURAS

/** Nombres de las escrituras, para `hasPermission(acciones, PERMISOS.clientesEditar)`. */
export const PERMISOS = Object.fromEntries(Object.keys(ESCRITURAS).map((k) => [k, k])) as {
  readonly [K in Permiso]: K
}

/** Escrituras que permiten estos roles y permisos de WorkOS (los de /auth/me). */
const FUNCIONES_ACCION: Partial<Record<Permiso, string>> = {
  organizacionEditar: 'entidad.editar', agenciasEditar: 'agencias.editar', usuariosEditar: 'usuarios.administrar',
  productosConsultar: 'productos.consultar', productosEditar: 'productos.editar', productosExportar: 'productos.exportar',
  catalogosEditar: 'catalogos.editar', clientesEditar: 'clientes.editar', clientesEstado: 'clientes.cambiarEstado',
  clientesRiesgo: 'clientes.riesgo.evaluar', cuentasAbrir: 'cuentas.abrir', cuentasEstado: 'cuentas.cambiarEstado',
  cuentasCupos: 'cuentas.cupos.modificar', tarjetasEmitir: 'tarjetas.emitir', tarjetasEstado: 'tarjetas.cambiarEstado',
  contabilidadEditar: 'contabilidad.cuentas.editar',
  plantillasEditar: 'contabilidad.plantillas.editar',
}

export function accionesPermitidas(roles: readonly string[], permisos: readonly string[], funciones?: readonly string[]): Permiso[] {
  const conRol = new Set(roles.map((rol) => rol.trim().toUpperCase()))
  return (Object.entries(ESCRITURAS) as [Permiso, Regla][])
    .filter(([accion, regla]) => {
      const funcion = FUNCIONES_ACCION[accion]
      if (funciones && funcion) return funciones.includes(funcion)
      return 'permiso' in regla ? permisos.includes(regla.permiso) : regla.roles.some((rol) => conRol.has(rol))
    })
    .map(([accion]) => accion)
}

/** Solo decide qué se MUESTRA: el backend vuelve a validar cada escritura. */
export function hasPermission(acciones: readonly string[], permiso: Permiso) {
  return acciones.includes(permiso)
}
