// Archivo Barril (Barrel file): Expone utilidades reutilizables sin dependencias de UI ni de features.

export { cn } from '@/shared/lib/utils';
export { esCedulaValida, esProvinciaValida } from '@/shared/lib/cedula';
export { accionesPermitidas, hasPermission, PERMISOS, type Permiso } from '@/shared/lib/permisos';
export { esquemaMotivo, minimoEfectivo, MOTIVO_MAXIMO_POR_DEFECTO, MOTIVO_MINIMO_POR_DEFECTO, type OpcionesMotivo } from '@/shared/lib/motivo';
export { aCsv, descargarCsv, type ColumnaCsv, type ValorCsv } from '@/shared/lib/csv';
