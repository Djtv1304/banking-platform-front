import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient, toApiError } from '@/shared/api'
import { Aviso, Button } from '@/shared/ui'
import { mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

const solicitudSchema = z.object({ idSolicitud: z.number() })
const historialSchema = z.array(z.object({
  idSolicitud: z.number(),
  antes: z.string(),
  despues: z.string(),
  fechaInicio: z.string(),
  solicitante: z.string(),
  aprobador: z.string(),
}))

type Destino = 'Activo' | 'Suspendido' | 'Retirado'

export function EstadoProductoAcciones({ ruta, estado, puedeSolicitar }: {
  ruta: string
  estado: string
  puedeSolicitar: boolean
}) {
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [destino, setDestino] = useState<Destino | null>(null)
  const historial = useQuery({
    queryKey: ['productos', 'historial-estado', ruta],
    enabled: mostrarHistorial,
    queryFn: async ({ signal }) => historialSchema.parse(
      (await apiClient.get(`${ruta}/historial`, { signal })).data,
    ),
  })
  const solicitud = useMutation({
    mutationFn: async (nuevo: Destino) => solicitudSchema.parse(
      (await apiClient.post(`${ruta}/estado`, { estado: nuevo })).data,
    ),
    onSuccess: () => setDestino(null),
  })

  const elegirDestino = (nuevo: Destino | null) => {
    solicitud.reset()
    setDestino(nuevo)
  }

  return <div className="flex flex-col gap-2">
    <div className="flex flex-wrap gap-2">
      {puedeSolicitar && estado !== 'Retirado' && (
        <Button size="sm" variant="outline" disabled={solicitud.isPending}
          onClick={() => elegirDestino(estado === 'Activo' ? 'Suspendido' : 'Activo')}>
          {estado === 'Activo' ? 'Suspender' : 'Activar'}
        </Button>
      )}
      {puedeSolicitar && (estado === 'Activo' || estado === 'Suspendido') && (
        <Button size="sm" variant="outline" disabled={solicitud.isPending}
          onClick={() => elegirDestino('Retirado')}>Retirar</Button>
      )}
      <Button size="sm" variant="ghost" aria-expanded={mostrarHistorial}
        onClick={() => setMostrarHistorial(!mostrarHistorial)}>Historial de estado</Button>
    </div>
    {destino && <div className="flex flex-wrap items-center gap-2">
      <span>Solicitar cambio a {destino}</span>
      <Button size="sm" disabled={solicitud.isPending} onClick={() => solicitud.mutate(destino)}>Solicitar aprobación</Button>
      <Button size="sm" variant="ghost" disabled={solicitud.isPending} onClick={() => elegirDestino(null)}>Cancelar</Button>
    </div>}
    {solicitud.isSuccess && !destino && <p role="status">Solicitud {solicitud.data.idSolicitud} pendiente de aprobación.</p>}
    {solicitud.isError && <Aviso tono="error">{mensajeErrorProducto(toApiError(solicitud.error))}</Aviso>}
    {mostrarHistorial && (
      historial.isError ? <Aviso tono="error">{mensajeErrorProducto(toApiError(historial.error))}</Aviso>
        : historial.isPending ? <p role="status">Cargando historial…</p>
          : historial.data.length ? (
            <ul className="space-y-2 text-sm">
              {historial.data.map(cambio => <li key={cambio.idSolicitud}>
                <p>{cambio.antes} → {cambio.despues} · {new Date(cambio.fechaInicio).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
                <p>Solicitó {cambio.solicitante} · Aprobó {cambio.aprobador}</p>
              </li>)}
            </ul>
          ) : <p>Sin cambios de estado aprobados.</p>
    )}
  </div>
}
