import { SolicitudTarjetaForm } from '@/features/tarjetas/components/SolicitudTarjetaForm'
import { useAuthStore } from '@/features/auth'
import { Aviso } from '@/shared/ui'

export function SolicitarTarjetaPage() {
  const agencia = useAuthStore((state) => state.user?.idAgencia)
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Solicitar tarjeta</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Registra una solicitud de débito para que otro operador la revise en Aprobaciones.
      </p>

      <div className="mt-8">
        {agencia ? <SolicitudTarjetaForm agencia={agencia} /> : (
          <Aviso>Selecciona una agencia operativa en la barra superior y pulsa Cambiar para continuar.</Aviso>
        )}
      </div>
    </div>
  )
}
