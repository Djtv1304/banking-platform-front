// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { LoginPage } from '@/features/auth/pages/LoginPage';
export { AvisoInactividad } from '@/features/auth/components/AvisoInactividad';
export { useActividadReciente } from '@/features/auth/inactividad';
export { useAccessProfile, useAuthStatus, useAuthStore, usePermisos } from '@/features/auth/store/auth.store';
export { canAccess, CLIENTES_ROLES, CUENTAS_ROLES, TARJETAS_ROLES, CREDITOS_ROLES, ORGANIZACION_ROLES, getAccessProfile, hasAnyRole, hasPermission, PERMISOS, ROLES } from '@/features/auth/lib/access';
export type { AccessProfile, Permiso } from '@/features/auth/lib/access';
export type { AuthStatus } from '@/features/auth/store/auth.store';
export { registerAuthHandlers, restoreSession, refreshSession, startSessionSync, signOut } from '@/features/auth/session';
export { sanitizeReturnTo } from '@/features/auth/lib/return-to';
export type { MeResponse } from '@/features/auth/api/auth.contract';
export { permiteFuncion, usePuedeFuncion } from '@/features/auth/lib/funciones';
export type { AutorizacionFunciones } from '@/features/auth/lib/funciones';
export { EstadoActualizacionAccesos } from '@/features/auth/components/EstadoActualizacionAccesos';
export { formatRol, formatRoles } from '@/features/auth/lib/roles';

export { SelectorAgencia } from '@/features/auth/components/SelectorAgencia';
export { agenciaAsignadaSchema } from '@/features/auth/api/auth.contract';

export { obtenerContextoAgencias } from '@/features/auth/api/auth.api';
export { permiteSeccion } from '@/features/auth/lib/accesos-secciones';
export { ActualizarAccesosButton } from '@/features/auth/components/ActualizarAccesosButton';
export { publicar as publicarEventoSesion } from '@/features/auth/lib/canal-sesion';
export { rutaLoginConRetorno } from '@/features/auth/lib/return-to';
