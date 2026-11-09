// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { SolicitarTarjetaPage } from '@/features/tarjetas/pages/SolicitarTarjetaPage'
export { BuscarTarjetasPage } from '@/features/tarjetas/pages/BuscarTarjetasPage'
export type { Tarjeta, TarjetaCreate } from '@/features/tarjetas/api/tarjetas.contract'
