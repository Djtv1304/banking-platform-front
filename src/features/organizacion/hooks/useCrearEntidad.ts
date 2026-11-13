import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api'
import { consultarExistenciaEntidad, crearEntidad, type EntidadCreate } from '@/features/organizacion/api/entidad'
import { confirmarEntidadEnCache } from '@/features/organizacion/hooks/useEntidad'

export function useCrearEntidad() {
  const cache = useQueryClient()
  const necesitaComprobar = useRef(false)
  const [comprobando, setComprobando] = useState(false)
  const [errorConsulta, setErrorConsulta] = useState<Error | null>(null)
  const mutacion = useMutation({
    mutationFn: crearEntidad,
    retry: false,
    onSuccess: entidad => confirmarEntidadEnCache(cache, entidad),
  })

  async function comprobar() {
    setComprobando(true)
    try {
      const existente = await consultarExistenciaEntidad()
      if (existente) await confirmarEntidadEnCache(cache, existente)
      necesitaComprobar.current = false
      return existente
    } catch (error) {
      setErrorConsulta(toApiError(error))
      throw error
    } finally {
      setComprobando(false)
    }
  }

  async function registrar(datos: EntidadCreate): Promise<'creada' | 'existente'> {
    setErrorConsulta(null)
    // Si el resultado anterior fue incierto, nunca repetir POST sin consultar.
    if (necesitaComprobar.current && await comprobar()) return 'existente'
    try {
      await mutacion.mutateAsync(datos)
      return 'creada'
    } catch (error) {
      const e = toApiError(error)
      if ((e.status === 409 && e.code === 'ENTIDAD_YA_EXISTE') ||
          e.status === null || e.status >= 500 || e.code === 'respuesta_invalida') {
        necesitaComprobar.current = true
        try {
          if (await comprobar()) return 'existente'
        } catch {
          // Mantener el borrador y exigir otra consulta antes del siguiente POST.
        }
      }
      throw error
    }
  }

  return {
    registrar,
    pendiente: mutacion.isPending || comprobando,
    error: errorConsulta ?? mutacion.error,
    reset: () => { mutacion.reset(); setErrorConsulta(null) },
  }
}
