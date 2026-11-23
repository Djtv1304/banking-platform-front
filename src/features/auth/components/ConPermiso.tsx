import type { ReactNode } from 'react'

import { permiteFuncion } from '@/features/auth/lib/funciones'
import { useAuthStore } from '@/features/auth/store/auth.store'

export interface ConPermisoProps {
  /** Función de acceso del backend (`contabilidad.cuentas.editar`); con varias basta una */
  funcion: string | readonly string[]
  /**
   * Respuesta cuando el backend todavía no envía funciones (`autorizacion` ausente): la regla por rol o permiso
   * que la pantalla ya usaba. Con funciones activas no se tiene en cuenta.
   */
  anterior: boolean
  /** Qué se muestra sin permiso; por defecto nada, así la acción desaparece en vez de fallar al usarla */
  sinPermiso?: ReactNode
  children: ReactNode
}

/**
 * Muestra su contenido sólo si la sesión tiene la función pedida. Es la versión declarativa de `usePuedeFuncion`
 * para botones y secciones; el backend vuelve a comprobar cada acción, así que esto ordena la pantalla, no la protege.
 * Para una pantalla entera sin acceso: `sinPermiso={<EstadoPantalla estado="sin-permiso" />}`.
 */
export function ConPermiso({ funcion, anterior, sinPermiso = null, children }: ConPermisoProps) {
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  const funciones: readonly string[] = typeof funcion === 'string' ? [funcion] : funcion
  const puede = funciones.some((f) => permiteFuncion(autorizacion, f, anterior))
  return <>{puede ? children : sinPermiso}</>
}
