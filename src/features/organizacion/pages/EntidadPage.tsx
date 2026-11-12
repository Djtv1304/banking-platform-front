import { toApiError } from '@/shared/api'
import { Aviso, Cargando } from '@/shared/ui'
import { TarjetaEntidad } from '@/features/organizacion/components/TarjetaEntidad'
import { useEntidad } from '@/features/organizacion/hooks/useEntidad'
import { entidadNoRegistrada, mensajeErrorEntidad } from '@/features/organizacion/lib/entidad-texto'

/** Datos de la cooperativa (solo ADMIN) */
export function EntidadPage() {
  const entidad = useEntidad()

  const contenido = (() => {
    if (entidad.isError) {
      const error = toApiError(entidad.error)
      if (entidadNoRegistrada(error)) return <Aviso>La entidad todavía no está registrada en el sistema.</Aviso>
      return <Aviso tono="error">{mensajeErrorEntidad(error, 'ver')}</Aviso>
    }
    if (entidad.isPending) return <Cargando texto="Consultando los datos de la entidad…" />
    return <TarjetaEntidad entidad={entidad.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Datos de la entidad</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Información legal y de contacto de la cooperativa tal como está registrada en el sistema.
        </p>
      </header>

      {contenido}
    </div>
  )
}
