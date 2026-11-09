import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Gauge, ListOrdered, RefreshCw } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import type { Cuenta } from '@/features/cuenta/api/cuentas.contract'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import { useCuenta, useNombresCuenta, useSaldoCuenta } from '@/features/cuenta/hooks/useCuentas'
import { usePermisosCupos } from '@/features/cuenta/hooks/useCupos'
import { leerIdCuenta } from '@/features/cuenta/lib/filtros'
import { formatearFechaConsulta, formatearMonto } from '@/features/cuenta/lib/formato'

const cardClassName = 'flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8'

/** CTA-03 (datos) y CTA-04 (saldos) de una cuenta en cualquier estado */
export function DetalleCuentaPage() {
  const { idCuenta: param } = useParams()
  // Un id no numérico o ≤ 0 no llega a la API: se trata igual que una cuenta inexistente
  const idCuenta = leerIdCuenta(param)
  const cuenta = useCuenta(idCuenta)

  const contenido = (() => {
    if (idCuenta === null || (cuenta.isError && toApiError(cuenta.error).status === 404)) {
      return (
        <SinDetalle>
          <Aviso>No existe una cuenta con ese ID.</Aviso>
        </SinDetalle>
      )
    }
    if (cuenta.isError) {
      return (
        <SinDetalle>
          <Aviso tono="error">{toApiError(cuenta.error).message}</Aviso>
        </SinDetalle>
      )
    }
    if (cuenta.isPending) {
      return (
        <SinDetalle>
          <Cargando texto="Cargando la cuenta…" />
        </SinDetalle>
      )
    }
    return <DetalleCuenta cuenta={cuenta.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-2.5 w-fit rounded-lg text-muted-foreground">
        <Link to="/cuentas">
          <ArrowLeft />
          Volver a la búsqueda
        </Link>
      </Button>
      {contenido}
    </div>
  )
}

/** Carga, error o cuenta inexistente: mismo título, sin datos */
function SinDetalle({ children }: { children: ReactNode }) {
  return (
    <>
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Detalle de la cuenta</h1>
      {children}
    </>
  )
}

function DetalleCuenta({ cuenta }: { cuenta: Cuenta }) {
  const nombres = useNombresCuenta()
  const cupos = usePermisosCupos()

  return (
    <>
      {/* Encabezado: las acciones sobre la cuenta (A-03) irían a su derecha */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">
            Cuenta {cuenta.numeroCuenta}
          </h1>
          <EstadoCuentaBadge estado={cuenta.estado} />
        </div>
        <div className="flex flex-wrap gap-3">
          {/* CTA-06 tiene los mismos roles que esta pantalla: siempre se muestra */}
          <Button asChild variant="outline" size="lg" className="rounded-lg px-3">
            <Link to={`/cuentas/${cuenta.idCuenta}/movimientos`}>
              <ListOrdered />
              Movimientos
            </Link>
          </Button>
          {cupos.ver && (
            <Button asChild variant="outline" size="lg" className="rounded-lg px-3">
              <Link to={`/cuentas/${cuenta.idCuenta}/cupos`}>
                <Gauge />
                Cupos por canal
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="datos-cuenta" className={cardClassName}>
          <h2 id="datos-cuenta" className="text-lg font-semibold text-heading">
            Datos de la cuenta
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Dato label="Número de cuenta">{cuenta.numeroCuenta}</Dato>
            <Dato label="Tipo">{cuenta.tipoCuenta}</Dato>
            <Dato label="Producto">{nombres.producto(cuenta.idProducto)}</Dato>
            <Dato label="Agencia">{nombres.agencia(cuenta.idAgencia)}</Dato>
            <Dato label="Estado">
              <EstadoCuentaBadge estado={cuenta.estado} />
            </Dato>
            <Dato label="ID del cliente">{cuenta.idCliente}</Dato>
          </dl>
        </section>

        <SaldoCuenta idCuenta={cuenta.idCuenta} cerrada={cuenta.estado === 'CERRADA'} />
      </div>
    </>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-heading">{children}</dd>
    </div>
  )
}

/** Los saldos salen solo de CTA-04; el disponible se muestra tal como lo calcula el backend */
function SaldoCuenta({ idCuenta, cerrada }: { idCuenta: number; cerrada: boolean }) {
  const saldo = useSaldoCuenta(idCuenta)
  const consultado = saldo.data ? formatearFechaConsulta(saldo.data.fechaConsulta) : null

  return (
    <section aria-labelledby="saldo-cuenta" className={cardClassName}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="saldo-cuenta" className="text-lg font-semibold text-heading">
          Saldo
        </h2>
        <Button
          variant="outline"
          size="lg"
          disabled={saldo.isFetching}
          onClick={() => void saldo.refetch()}
          className="rounded-lg px-3"
        >
          <RefreshCw className={cn(saldo.isFetching && 'animate-spin')} />
          Actualizar saldo
        </Button>
      </header>

      {cerrada && <Aviso>Una cuenta cerrada no tiene saldo disponible.</Aviso>}

      {saldo.isPending ? (
        <Cargando texto="Consultando el saldo…" />
      ) : saldo.isError ? (
        <Aviso tono="error">{toApiError(saldo.error).message}</Aviso>
      ) : (
        <>
          <dl className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Saldo</dt>
              <dd className="font-medium text-heading tabular-nums">{formatearMonto(saldo.data.saldo)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Retenido</dt>
              <dd className="font-medium text-heading tabular-nums">{formatearMonto(saldo.data.saldoRetenido)}</dd>
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <dt className="text-sm text-muted-foreground">Disponible</dt>
              <dd className="text-3xl font-bold tracking-tight text-heading tabular-nums">
                {formatearMonto(saldo.data.saldoDisponible)}
              </dd>
            </div>
          </dl>
          {consultado && <p className="text-sm text-muted-foreground">Consultado el {consultado}</p>}
        </>
      )}
    </section>
  )
}
