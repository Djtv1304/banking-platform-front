// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export type {
  ActividadEconomica,
  Agencia,
  Canal,
  Ciudad,
  Denominacion,
  Pais,
  Producto,
  Red,
  SistemaAmortizacion,
  SubProducto,
  TasaInteres,
  TipoAntecedente,
  TipoCredito,
  TipoMovimientoCaja,
  TipoProducto,
  TipoTarjeta,
} from '@/features/catalogos/api/catalogos.contract'
export {
  useActividadesEconomicas,
  useAgencias,
  useCanales,
  useCiudades,
  useDenominaciones,
  usePaises,
  useProductos,
  useRedes,
  useSistemasAmortizacion,
  useTasasInteres,
  useTiposAntecedente,
  useTiposCredito,
  useTiposMovimientoCaja,
} from '@/features/catalogos/hooks/useCatalogos'
export { CATALOGOS_ROLES } from '@/features/catalogos/api/catalogos.contract'
export { CatalogosPage } from '@/features/catalogos/pages/CatalogosPage'
