// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export type { ActividadEconomica, Ciudad, Pais } from '@/features/catalogos/api/catalogos.contract'
export { catalogosQueryKey, useActividadesEconomicas, useCiudades, usePaises } from '@/features/catalogos/hooks/useCatalogos'
