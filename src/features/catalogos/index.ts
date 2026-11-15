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
  SubProducto,
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
  useTiposAntecedente,
  useTiposCredito,
  useTiposMovimientoCaja,
} from '@/features/catalogos/hooks/useCatalogos'
