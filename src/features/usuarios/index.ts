// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { UsuariosPage } from '@/features/usuarios/pages/UsuariosPage'
export { DetalleUsuarioPage } from '@/features/usuarios/pages/DetalleUsuarioPage'
export { ROLES_GESTION_USUARIOS } from '@/features/usuarios/lib/acceso'
// Para mostrar quién hizo una operación en otros módulos (se pide solo cuando hace falta)
export { useUsuario, useUsuarios } from '@/features/usuarios/hooks/useUsuarios'
export { nombreCompleto } from '@/features/usuarios/lib/formato'
export type { UsuarioDetalle, UsuarioResumen } from '@/features/usuarios/api/usuarios.contract'
