// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { LoginPage } from './pages/LoginPage';
export { useAccessProfile, useAuthStatus, useAuthStore } from './store/auth.store';
export { canAccess, getAccessProfile, ROLES } from './lib/access';
export type { AccessProfile } from './lib/access';
export type { AuthStatus } from './store/auth.store';
export { registerAuthHandlers, restoreSession, signOut } from './session';
export { sanitizeReturnTo } from './lib/return-to';
export type { MeResponse } from './api/auth.contract';
