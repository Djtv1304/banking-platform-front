// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { LoginPage } from './pages/LoginPage';
export { useAuthStatus, useAuthStore } from './store/auth.store';
export type { AuthStatus } from './store/auth.store';
export { registerAuthHandlers, restoreSession, signOut } from './session';
export { sanitizeReturnTo } from './lib/return-to';
export type { MeResponse } from './api/auth.contract';
