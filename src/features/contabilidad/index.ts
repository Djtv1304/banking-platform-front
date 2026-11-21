// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { CONTABILIDAD_ROLES } from '@/features/contabilidad/api/contabilidad.contract'
export type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
export { PlanCuentasPage } from '@/features/contabilidad/pages/PlanCuentasPage'
export { AsientosPage } from '@/features/contabilidad/pages/AsientosPage'
export { FechaContablePage } from '@/features/contabilidad/pages/FechaContablePage'
export { CuentasProductoPage } from '@/features/contabilidad/pages/CuentasProductoPage'
export { CuentasSubproducto } from '@/features/contabilidad/components/CuentasSubproducto'
