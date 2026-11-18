import type { MeResponse } from '@/features/auth/api/auth.contract'
import { useAuthStore } from '@/features/auth/store/auth.store'

export type AutorizacionFunciones = MeResponse['autorizacion']
export function permiteFuncion(autorizacion: AutorizacionFunciones, funcion: string, anterior: boolean) {
  return autorizacion?.activa ? autorizacion.funciones.includes(funcion) : anterior
}
export function usePuedeFuncion(funcion: string, anterior: boolean) {
  const autorizacion = useAuthStore((s) => s.user?.autorizacion)
  return permiteFuncion(autorizacion, funcion, anterior)
}
