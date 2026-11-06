import type { Cliente, EstadoCliente, EstadoDestino } from '@/features/clientes/api/gestion-clientes'

const rolesConsulta = ['ASESOR', 'CAJERO', 'SUPERVISOR', 'ADMIN']
const rolesEdicion = ['ASESOR', 'ADMIN']
const rolesEstado = ['ASESOR', 'SUPERVISOR', 'ADMIN']
const rolesHistorial = ['SUPERVISOR', 'AUDITOR', 'ADMIN']

export function accesoGestionClientes(roles: readonly string[]) {
  const normalizados = roles.map((rol) => rol.trim().toUpperCase())
  const tieneRol = (permitidos: string[]) => normalizados.some((rol) => permitidos.includes(rol))
  return {
    consulta: tieneRol(rolesConsulta),
    edicion: tieneRol(rolesEdicion),
    estado: tieneRol(rolesEstado),
    historial: tieneRol(rolesHistorial),
  }
}

const transiciones: Record<EstadoCliente, EstadoDestino[]> = {
  Activo: ['Inactivo', 'Suspendido', 'Bloqueado', 'Eliminado'],
  Inactivo: ['Activo', 'Eliminado'],
  Suspendido: ['Activo', 'Eliminado'],
  Bloqueado: ['Activo', 'Eliminado'],
  Pendiente: ['Eliminado'],
  Cerrado: ['Eliminado'],
  Eliminado: [],
}

export function estadosPermitidos(actual: EstadoCliente) {
  return transiciones[actual] ?? []
}

export function nombreCliente(cliente: Cliente) {
  return cliente.razonSocial || [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ')
}
