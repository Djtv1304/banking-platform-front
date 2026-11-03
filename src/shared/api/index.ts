// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { apiClient, setUnauthorizedHandler } from './client';
export { ApiError, toApiError } from './errors';
