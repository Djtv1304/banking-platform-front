// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { apiClient, setUnauthorizedHandler } from '@/shared/api/client';
export { ApiError, toApiError } from '@/shared/api/errors';
export type { ApiFieldError } from '@/shared/api/errors';
