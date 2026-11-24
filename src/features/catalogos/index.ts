// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export type {
  ActividadEconomica,
  Agencia,
  Canal,
  Ciudad,
  Comision,
  Denominacion,
  Pais,
  Producto,
  Red,
  Seguro,
  SistemaAmortizacion,
  SubProducto,
  TasaInteres,
  TipoTasa,
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
  useComisiones,
  useCiudades,
  useDenominaciones,
  usePaises,
  useProductos,
  useRedes,
  useSeguros,
  useSistemasAmortizacion,
  useTasasInteres,
  useTiposAntecedente,
  useTiposCredito,
  useTiposMovimientoCaja,
} from '@/features/catalogos/hooks/useCatalogos'
export { CATALOGOS_ROLES } from '@/features/catalogos/api/catalogos.contract'
export { useTiposDireccion } from '@/features/catalogos/hooks/useTiposDireccion'
export { CatalogosPage } from '@/features/catalogos/pages/CatalogosPage'
export { ETIQUETA_TIPO_TASA } from '@/features/catalogos/api/catalogos.contract'
