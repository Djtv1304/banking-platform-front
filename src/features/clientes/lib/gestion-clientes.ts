import { hasPermission, PERMISOS } from '@/shared/lib'
import type { EstadoDestino } from '@/features/clientes/api/gestion-clientes'

const rolesConsulta = ['ASESOR', 'CAJERO', 'SUPERVISOR', 'ADMIN']
const rolesHistorial = ['SUPERVISOR', 'AUDITOR', 'ADMIN']

/** Consultar e historial por rol; editar y cambiar estado por permiso de WorkOS */
export function accesoGestionClientes(roles: readonly string[], permisos: readonly string[] = []) {
  const normalizados = roles.map((rol) => rol.trim().toUpperCase())
  const tieneRol = (permitidos: string[]) => normalizados.some((rol) => permitidos.includes(rol))
  return {
    consulta: tieneRol(rolesConsulta),
    edicion: hasPermission(permisos, PERMISOS.clientesEditar),
    estado: hasPermission(permisos, PERMISOS.clientesEstado),
    historial: tieneRol(rolesHistorial),
  }
}

const transiciones: Partial<Record<string, EstadoDestino[]>> = {
  Activo: ['Inactivo', 'Suspendido', 'Bloqueado', 'Eliminado'],
  Inactivo: ['Activo', 'Eliminado'],
  Suspendido: ['Activo', 'Eliminado'],
  Bloqueado: ['Activo', 'Eliminado'],
  Pendiente: ['Eliminado'],
  Cerrado: ['Eliminado'],
  Eliminado: [],
}

export function estadosPermitidos(actual: string) {
  return transiciones[actual] ?? []
}
