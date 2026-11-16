// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { UsuariosPage } from '@/features/usuarios/pages/UsuariosPage'
export { DetalleUsuarioPage } from '@/features/usuarios/pages/DetalleUsuarioPage'
export { ROLES_GESTION_USUARIOS } from '@/features/usuarios/lib/acceso'

export { ROLES_USUARIO } from '@/features/usuarios/api/usuarios.contract'
