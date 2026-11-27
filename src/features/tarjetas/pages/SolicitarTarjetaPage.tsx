import { Link, useLocation } from 'react-router'

import { SolicitudTarjetaForm } from '@/features/tarjetas/components/SolicitudTarjetaForm'
import { useTarjeta } from '@/features/tarjetas/hooks/useConsultaTarjetas'
import { useAuthStore } from '@/features/auth'
import { Aviso, Button, Cargando } from '@/shared/ui'

export function SolicitarTarjetaPage() {
  const agencia = useAuthStore((state) => state.user?.idAgencia)
  const estado: { idTarjetaReemplazada?: number } | null = useLocation().state
  const idAnterior = estado?.idTarjetaReemplazada
  const origen = useTarjeta(agencia && idAnterior ? idAnterior : null)
  const contenido = (() => {
    if (!agencia) return <Aviso>Selecciona una agencia operativa en la barra superior y pulsa Cambiar para continuar.</Aviso>
    if (!idAnterior) return <SolicitudTarjetaForm agencia={agencia} key={agencia} />
    if (origen.isPending) return <Cargando texto="Consultando la tarjeta anterior…" />
    if (origen.isError) return <Aviso>No se pudo cargar la tarjeta anterior. <Link to="/tarjetas">Volver a tarjetas</Link></Aviso>
    return <SolicitudTarjetaForm agencia={agencia} origen={origen.data} key={`${agencia}-${idAnterior}`} />
  })()
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Solicitar tarjeta</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Registra una solicitud de débito para que otro operador la revise en Aprobaciones.
      </p>

      <div className="mt-8">
        {contenido}
        {idAnterior && <Button asChild variant="ghost" className="mt-4"><Link to={`/tarjetas/${idAnterior}`}>Volver a la tarjeta anterior</Link></Button>}
      </div>
    </div>
  )
}
