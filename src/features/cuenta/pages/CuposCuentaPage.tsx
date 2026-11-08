import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button } from '@/shared/ui'
import { useCanales } from '@/features/catalogos'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { TarjetaCupo } from '@/features/cuenta/components/TarjetaCupo'
import { useCuenta } from '@/features/cuenta/hooks/useCuentas'
import { useCupos } from '@/features/cuenta/hooks/useCupos'
import { mensajeErrorCupos } from '@/features/cuenta/lib/cupos'
import { leerIdCuenta } from '@/features/cuenta/lib/filtros'

/** CTA-07 · Cupo que rige en cada canal de una cuenta, con lo consumido y lo disponible */
export function CuposCuentaPage() {
  const { idCuenta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una cuenta inexistente
  const idCuenta = leerIdCuenta(param)
  const cupos = useCupos(idCuenta)
  // Solo para mostrar el número de la cuenta; si falla, la página sigue sin él
  const cuenta = useCuenta(idCuenta)
  const { data: canales } = useCanales()
  // CAT-08 lista solo los canales activos; uno inactivo con cupo se muestra por su id
  const nombreCanal = (idCanal: number) =>
    canales.find((canal) => canal.idCanal === idCanal)?.nombreCanal ?? `Canal ${idCanal}`

  const contenido = (() => {
    if (idCuenta === null || (cupos.isError && toApiError(cupos.error).status === 404)) {
      return <Aviso>No existe una cuenta con ese ID.</Aviso>
    }
    if (cupos.isError) return <Aviso tono="error">{mensajeErrorCupos(toApiError(cupos.error), 'ver')}</Aviso>
    if (cupos.isPending) return <Cargando texto="Consultando los cupos…" />
    if (cupos.data.length === 0) return <Aviso>Esta cuenta no tiene cupos configurados en ningún canal.</Aviso>

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {cupos.data.map((cupo) => (
          <TarjetaCupo key={cupo.idCanal} cupo={cupo} nombreCanal={nombreCanal(cupo.idCanal)} />
        ))}
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to={idCuenta === null ? '/cuentas' : `/cuentas/${idCuenta}`}>
          <ArrowLeft />
          {idCuenta === null ? 'Volver a la búsqueda' : 'Volver a la cuenta'}
        </Link>
      </Button>

      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Cupos por canal</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {cuenta.data && <span className="font-medium text-heading">Cuenta {cuenta.data.numeroCuenta} · </span>}
          Lo que el cliente puede mover en cada canal. El disponible descuenta lo consumido hoy y en el mes.
        </p>
      </header>

      {contenido}
    </div>
  )
}
