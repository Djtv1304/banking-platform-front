import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, History, Pencil } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button } from '@/shared/ui'
import { useCanales } from '@/features/catalogos'
import type { CupoEfectivo } from '@/features/cuenta/api/cupos.contract'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { EditarCupoDialog } from '@/features/cuenta/components/EditarCupoDialog'
import { HistorialCupoDialog } from '@/features/cuenta/components/HistorialCupoDialog'
import { TarjetaCupo } from '@/features/cuenta/components/TarjetaCupo'
import { useCuenta } from '@/features/cuenta/hooks/useCuentas'
import { useCupos, usePermisosCupos } from '@/features/cuenta/hooks/useCupos'
import { mensajeErrorCupos } from '@/features/cuenta/lib/cupos'
import { leerIdCuenta } from '@/features/cuenta/lib/filtros'

/** CTA-07 · Cupo que rige en cada canal de una cuenta, con lo consumido y lo disponible */
export function CuposCuentaPage() {
  const { idCuenta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una cuenta inexistente
  const idCuenta = leerIdCuenta(param)
  const permisos = usePermisosCupos()
  const cupos = useCupos(permisos.ver ? idCuenta : null)
  // Solo para mostrar el número de la cuenta; si falla, la página sigue sin él
  const cuenta = useCuenta(permisos.ver ? idCuenta : null)
  const { data: canales } = useCanales()
  // CAT-08 lista solo los canales activos; uno inactivo con cupo se muestra por su id
  const nombreCanal = (idCanal: number) =>
    canales.find((canal) => canal.idCanal === idCanal)?.nombreCanal ?? `Canal ${idCanal}`
  // Editar (CTA-08) e historial (CTA-09) solo se muestran a los roles que el backend permite
  const [editando, setEditando] = useState<CupoEfectivo | null>(null)
  const [historialDe, setHistorialDe] = useState<number | null>(null)
  const [guardado, setGuardado] = useState<string | null>(null)

  const editar = (cupo: CupoEfectivo) => {
    setGuardado(null)
    setEditando(cupo)
  }

  const alGuardar = (cupo: CupoEfectivo) => {
    const nombre = nombreCanal(cupo.idCanal)
    setEditando(null)
    // Una vigencia ya vencida se guarda, pero sigue rigiendo el cupo del producto
    setGuardado(
      cupo.origen === 'Personalizado'
        ? `Guardamos el cupo personalizado de ${nombre}.`
        : `Guardamos el cupo de ${nombre}, pero su vigencia ya terminó: rige el cupo del producto.`,
    )
  }

  const contenido = (() => {
    if (idCuenta === null || (cupos.isError && toApiError(cupos.error).status === 404)) {
      return <Aviso>No existe una cuenta con ese ID.</Aviso>
    }
    if (!permisos.ver && permisos.historial && idCuenta !== null) return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-heading">Historial de cupos por canal</h2>
        <div className="mt-4 flex flex-wrap gap-3">{canales.map((canal) => (
          <Button key={canal.idCanal} variant="outline" onClick={() => setHistorialDe(canal.idCanal)}><History />{canal.nombreCanal}</Button>
        ))}</div>
      </section>
    )
    if (cupos.isError) return <Aviso tono="error">{mensajeErrorCupos(toApiError(cupos.error), 'ver')}</Aviso>
    if (cupos.isPending) return <Cargando texto="Consultando los cupos…" />
    if (cupos.data.length === 0) return <Aviso>Esta cuenta no tiene cupos configurados en ningún canal.</Aviso>

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {cupos.data.map((cupo) => (
          <TarjetaCupo key={cupo.idCanal} cupo={cupo} nombreCanal={nombreCanal(cupo.idCanal)}>
            {(permisos.editar || permisos.historial) && (
              <>
                {permisos.editar && (
                  <Button variant="outline" size="lg" onClick={() => editar(cupo)} className="rounded-lg px-3">
                    <Pencil />
                    Editar cupo
                  </Button>
                )}
                {permisos.historial && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setHistorialDe(cupo.idCanal)}
                    className="rounded-lg px-3"
                  >
                    <History />
                    Ver historial
                  </Button>
                )}
              </>
            )}
          </TarjetaCupo>
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

      {guardado && <Aviso>{guardado}</Aviso>}
      {contenido}

      {idCuenta !== null && (
        <>
          <EditarCupoDialog
            idCuenta={idCuenta}
            cupo={editando}
            nombreCanal={editando ? nombreCanal(editando.idCanal) : ''}
            onCerrar={() => setEditando(null)}
            onGuardado={alGuardar}
          />
          <HistorialCupoDialog
            idCuenta={idCuenta}
            idCanal={historialDe}
            nombreCanal={historialDe === null ? '' : nombreCanal(historialDe)}
            onCerrar={() => setHistorialDe(null)}
          />
        </>
      )}
    </div>
  )
}
