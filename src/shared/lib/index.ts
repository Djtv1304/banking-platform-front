// Archivo Barril (Barrel file): Expone utilidades reutilizables sin dependencias de UI ni de features.

export { cn } from '@/shared/lib/utils';
export { esCedulaValida, esProvinciaValida } from '@/shared/lib/cedula';
export { hasPermission, PERMISOS, type Permiso } from '@/shared/lib/permisos';
