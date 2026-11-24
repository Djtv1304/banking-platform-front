import { Link } from 'react-router'
import { useDetalleAprobacion } from '@/features/aprobaciones/hooks/useAprobaciones'
import { Aviso, Button, ErrorApi } from '@/shared/ui'
import {
  useConsultarCambio,
  useFinalizarSolicitudRoles,
  useRecuperacionUsuario,
  useSolicitudRoles,
} from '@/features/usuarios/hooks/useUsuarios'

export function RecuperacionUsuario({ idUsuario, onConfirmado }: {
  idUsuario: number
  onConfirmado?: (mensaje: string) => void
}) {
  const pendiente = useRecuperacionUsuario(idUsuario)
  const consulta = useConsultarCambio(idUsuario)
  if (!pendiente) return null

  return <Aviso tono="error">
    {pendiente.mensaje}
    {consulta.data === false && <p>La ficha aún no confirma el cambio. Si persiste, solicita una revisión operativa.</p>}
    {consulta.isError && <ErrorApi error={consulta.error} />}
    <Button variant="outline" size="sm" className="w-fit" disabled={consulta.isPending} onClick={async () => {
      try {
        if (await consulta.mutateAsync()) onConfirmado?.('Consultamos el estado confirmado del usuario.')
      } catch { /* La consulta conserva el bloqueo y muestra su error. */ }
    }}>Consultar estado del cambio</Button>
  </Aviso>
}

export function SeguimientoCambioUsuario({ idUsuario, onConfirmado }: {
  idUsuario: number
  onConfirmado: (mensaje: string) => void
}) {
  const solicitud = useSolicitudRoles(idUsuario)
  const consulta = useDetalleAprobacion(solicitud?.idSolicitud ?? 0)
  const finalizar = useFinalizarSolicitudRoles(idUsuario)
  const estado = consulta.data?.estado ?? solicitud?.estado

  const actualizar = async () => {
    const resultado = await consulta.refetch()
    if (resultado.isError || !resultado.data) return
    const { estado } = resultado.data
    if (estado === 'Pendiente' || estado === 'Aprobada') return
    try {
      await finalizar.mutateAsync(estado === 'Ejecutada')
      onConfirmado(estado === 'Ejecutada'
        ? 'La solicitud se ejecutó. La ficha muestra los roles confirmados.'
        : 'La solicitud quedó ' + estado.toLowerCase() + '.')
    } catch { /* Se conserva la solicitud para volver a consultar. */ }
  }

  return <>
    <RecuperacionUsuario idUsuario={idUsuario} onConfirmado={onConfirmado} />
    {solicitud && <Aviso>
      <p>Solicitud de roles #{solicitud.idSolicitud} · {estado}</p>
      <Link className="w-fit font-medium text-link underline" to={'/aprobaciones/' + solicitud.idSolicitud}>Consultar solicitud</Link>
      {consulta.isError && <ErrorApi error={consulta.error} />}
      {finalizar.isError && <ErrorApi error={finalizar.error} />}
      <Button variant="outline" size="sm" className="w-fit" disabled={consulta.isFetching || finalizar.isPending} onClick={() => void actualizar()}>
        Actualizar estado de la solicitud
      </Button>
    </Aviso>}
  </>
}
