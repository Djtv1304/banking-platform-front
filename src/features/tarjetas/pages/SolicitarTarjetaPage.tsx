import { SolicitudTarjetaForm } from '@/features/tarjetas/components/SolicitudTarjetaForm'

export function SolicitarTarjetaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Solicitar tarjeta</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Registra la solicitud de una tarjeta de débito o crédito para un cliente. Todos los campos son obligatorios
        salvo que se indique lo contrario.
      </p>

      <div className="mt-8">
        <SolicitudTarjetaForm />
      </div>
    </div>
  )
}
