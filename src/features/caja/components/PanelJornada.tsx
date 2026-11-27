import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, InsigniaEstado } from '@/shared/ui'
import { useTiposMovimientoCaja } from '@/features/catalogos'
import { mensajeErrorCaja } from '@/features/caja/api/caja.api'
import type { CajaFisica, Jornada } from '@/features/caja/api/caja.contract'
import { ULTIMAS_OPERACIONES, useDotaciones, useUltimosMovimientos } from '@/features/caja/hooks/useCaja'
import {
  ESTADO_JORNADA,
  etiquetaTipoDotacion,
  etiquetaTipoMovimiento,
  formatearFechaHora,
  formatearMonto,
  montoConSigno,
  nombreVentanilla,
  totalDotado,
} from '@/features/caja/lib/formato'

interface ErrorConReintento {
  error: unknown
  que: string
  cargando: boolean
  reintentar: () => void
}

function ErrorBloque({ error, que, cargando, reintentar }: ErrorConReintento) {
  return (
    <Aviso tono="error">
      {mensajeErrorCaja(error, que)}
      <Button variant="outline" size="sm" disabled={cargando} onClick={reintentar} className="w-fit">
        <RefreshCw className={cn(cargando && 'animate-spin')} />
        Reintentar
      </Button>
    </Aviso>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="text-base font-semibold text-heading">{children}</dd>
    </div>
  )
}

function Bloque({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <h2 id={id} className="text-lg font-semibold text-heading">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/**
 * Inicio de ventanilla con la jornada abierta: estado, ventanilla, efectivo recibido y últimas
 * operaciones (CAJ-04, CAJ-08 y CAJ-12). `caja` es null si CAJ-01 no la trae (otra agencia o inactiva).
 */
export function PanelJornada({ jornada, caja }: { jornada: Jornada; caja: CajaFisica | null }) {
  const dotaciones = useDotaciones(jornada.idJornadaCaja)
  const movimientos = useUltimosMovimientos(jornada.idJornadaCaja)
  const tipos = useTiposMovimientoCaja()
  const estado = ESTADO_JORNADA[jornada.estado]

  return (
    <div className="flex flex-col gap-5">
      <Bloque id="jornada-resumen" titulo="Mi jornada">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Estado">
            <InsigniaEstado tono={estado.tono}>{estado.texto}</InsigniaEstado>
          </Dato>
          <Dato etiqueta="Ventanilla">
            {nombreVentanilla(caja ?? { idCajaFisica: jornada.idCajaFisica, codigoCaja: null })}
            <span className="block text-sm font-normal text-muted-foreground">Agencia {jornada.idAgencia}</span>
          </Dato>
          <Dato etiqueta="Apertura">{formatearFechaHora(jornada.fechaHoraApertura)}</Dato>
          <Dato etiqueta="Dinero inicial">{formatearMonto(jornada.dineroInicial)}</Dato>
        </dl>
        {caja?.limiteEfectivoCaja != null && (
          <p className="text-sm text-muted-foreground">Límite de efectivo de la ventanilla: {formatearMonto(caja.limiteEfectivoCaja)}</p>
        )}
        {jornada.observacion && <p className="text-sm text-muted-foreground">Observación: {jornada.observacion}</p>}
      </Bloque>

      <Bloque id="jornada-dotaciones" titulo="Efectivo recibido de la bóveda">
        {dotaciones.isPending ? (
          <Cargando texto="Cargando las dotaciones…" />
        ) : dotaciones.isError ? (
          <ErrorBloque error={dotaciones.error} que="consultar las dotaciones" cargando={dotaciones.isFetching} reintentar={() => void dotaciones.refetch()} />
        ) : dotaciones.data.length === 0 ? (
          <Aviso>Todavía no recibes la dotación de la bóveda. Hasta entonces la ventanilla no tiene efectivo.</Aviso>
        ) : (
          <>
            <p className="text-base">
              Total recibido: <strong className="text-heading">{formatearMonto(totalDotado(dotaciones.data))}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Dotaciones de la jornada</caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">Tipo</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Monto</th>
                    <th scope="col" className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dotaciones.data.map((dotacion) => (
                    <tr key={dotacion.idDotacionCaja} className="border-t border-border">
                      <td className="py-2 pr-4">{etiquetaTipoDotacion(dotacion.tipoDotacion)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{dotacion.monto != null ? formatearMonto(dotacion.monto) : '—'}</td>
                      <td className="py-2">{dotacion.estado ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Bloque>

      <Bloque id="jornada-operaciones" titulo="Últimas operaciones">
        {movimientos.isPending ? (
          <Cargando texto="Cargando las operaciones…" />
        ) : movimientos.isError ? (
          <ErrorBloque error={movimientos.error} que="consultar las operaciones" cargando={movimientos.isFetching} reintentar={() => void movimientos.refetch()} />
        ) : movimientos.data.items.length === 0 ? (
          <Aviso>Aún no hay operaciones en esta jornada.</Aviso>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Últimas operaciones de la jornada</caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">Fecha y hora</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Operación</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Monto</th>
                    <th scope="col" className="py-2 font-medium">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.data.items.map((movimiento) => (
                    <tr key={movimiento.idMovimientoCaja} className="border-t border-border">
                      <td className="py-2 pr-4 whitespace-nowrap">{movimiento.fechaHora ? formatearFechaHora(movimiento.fechaHora) : '—'}</td>
                      <td className="py-2 pr-4">{etiquetaTipoMovimiento(movimiento, tipos.data)}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{montoConSigno(movimiento)}</td>
                      <td className="py-2 text-muted-foreground">{movimiento.observacion ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movimientos.data.total > ULTIMAS_OPERACIONES && (
              <p className="text-sm text-muted-foreground">
                Se muestran las {ULTIMAS_OPERACIONES} más recientes de {movimientos.data.total}.
              </p>
            )}
          </>
        )}
      </Bloque>
    </div>
  )
}
