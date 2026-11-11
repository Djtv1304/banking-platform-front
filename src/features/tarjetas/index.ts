// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { SolicitarTarjetaPage } from '@/features/tarjetas/pages/SolicitarTarjetaPage'
export { BuscarTarjetasPage } from '@/features/tarjetas/pages/BuscarTarjetasPage'
export { DetalleTarjetaPage } from '@/features/tarjetas/pages/DetalleTarjetaPage'
export type { Tarjeta, TarjetaCreate } from '@/features/tarjetas/api/tarjetas.contract'
// Piezas que reutiliza la apertura de cuenta (A-01): buscar al cliente con el mismo formulario
export type { Cliente } from '@/features/tarjetas/api/tarjetas.contract'
export { BuscarCliente } from '@/features/tarjetas/components/BuscarCliente'
export { Field, FieldError, FormSection, fieldClassName } from '@/features/tarjetas/components/form-fields'
export { useClientePorIdentificacion } from '@/features/tarjetas/hooks/useSolicitudTarjeta'
export { a11y, nombreCliente, opcionClassName } from '@/features/tarjetas/lib/formulario'
