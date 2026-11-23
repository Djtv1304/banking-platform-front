import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'

const tiposDireccionSchema = z.array(z.object({
  codigo: z.string().min(1).max(20),
  nombre: z.string().min(1),
  estado: z.enum(['A', 'I']),
}))

export async function getTiposDireccion() {
  const { data } = await apiClient.get<unknown>('/api/v1/catalogos/tipos-direccion')
  const resultado = tiposDireccionSchema.safeParse(data)
  if (!resultado.success) {
    throw new ApiError('No pudimos leer los tipos de dirección.', 502, 'respuesta_invalida')
  }
  return resultado.data
}

export function useTiposDireccion() {
  const consulta = useQuery({
    queryKey: ['catalogos', 'tipos-direccion'],
    queryFn: getTiposDireccion,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return { ...consulta, data: consulta.data ?? [] }
}
