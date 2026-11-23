import { useAuthStore, usePuedeFuncion } from '@/features/auth'

export function usePermisosImportacion() {
  const permiso = useAuthStore((s) => s.user?.permisos.includes('con-cuenta-editar') ?? false)
  const preparar = usePuedeFuncion('contabilidad.importaciones.preparar', permiso)
  const consultar = usePuedeFuncion('contabilidad.importaciones.consultar', permiso)
  const aplicar = usePuedeFuncion('contabilidad.importaciones.aplicar', permiso)
  return { preparar, consultar, aplicar }
}
