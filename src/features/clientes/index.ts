// Archivo Barril (Barrel file): Centraliza y controla la API pública de este módulo.
// Sirve para exportar únicamente los componentes, hooks o tipos que otros módulos necesitan usar, ocultando los archivos internos.

export { RegistrarClientePage } from '@/features/clientes/pages/RegistrarClientePage';
export type { RegistroClienteData } from '@/features/clientes/schemas/registro-cliente.schema';
