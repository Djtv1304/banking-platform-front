// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { CuentasCliente } from '@/features/cuenta/components/CuentasCliente'
export type { Cuenta, EstadoCuenta } from '@/features/cuenta/api/cuenta.contract'
