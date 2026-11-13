import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agregarDireccion, darBajaDireccion, editarDireccion, listarDirecciones } from '@/features/clientes/api/direcciones.api'
import type { DireccionCambio, DireccionNueva } from '@/features/clientes/api/direcciones.contract'

export function useDirecciones(idCliente: number) {
  const cache = useQueryClient()
  const consulta = useQuery({
    queryKey: ['clientes', 'direcciones', idCliente],
    queryFn: ({ signal }) => listarDirecciones(idCliente, signal),
    retry: false,
  })
  const actualizar = async () => {
    // Una mutación confirmada no se trata como fallida si falla el refresco.
    // No modificar flags en memoria: el servidor decide la principal única.
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['clientes', 'direcciones', idCliente] }),
      cache.invalidateQueries({ queryKey: ['clientes', 'detalle', idCliente] }),
      cache.invalidateQueries({ queryKey: ['clientes', 'busqueda'] }),
      cache.invalidateQueries({ queryKey: ['clientes', 'historial', idCliente] }),
    ])
  }
  const alta = useMutation({ mutationFn: (body: DireccionNueva) => agregarDireccion(idCliente, body), onSuccess: actualizar })
  const edicion = useMutation({
    mutationFn: ({ id, body }: { id: number; body: DireccionCambio }) => editarDireccion(idCliente, id, body),
    onSuccess: actualizar,
  })
  const baja = useMutation({ mutationFn: (id: number) => darBajaDireccion(idCliente, id), onSuccess: actualizar })
  return { consulta, alta, edicion, baja, pendiente: alta.isPending || edicion.isPending || baja.isPending }
}
