// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { LoginPage } from '@/features/auth/pages/LoginPage';
export { useAccessProfile, useAuthStatus, useAuthStore } from '@/features/auth/store/auth.store';
export { canAccess, CLIENTES_ROLES, getAccessProfile, hasAnyRole, ROLES } from '@/features/auth/lib/access';
export type { AccessProfile } from '@/features/auth/lib/access';
export type { AuthStatus } from '@/features/auth/store/auth.store';
export { registerAuthHandlers, restoreSession, signOut } from '@/features/auth/session';
export { sanitizeReturnTo } from '@/features/auth/lib/return-to';
export type { MeResponse } from '@/features/auth/api/auth.contract';
export { formatRol, formatRoles } from '@/features/auth/lib/roles';
