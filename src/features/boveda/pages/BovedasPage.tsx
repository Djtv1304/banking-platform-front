import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, FileClock, RefreshCw, Vault } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import { mensajeErrorBoveda } from '@/features/boveda/api/bovedas.api'
import { TIPOS_BOVEDA, type Boveda } from '@/features/boveda/api/bovedas.contract'
import { Campo } from '@/features/boveda/components/Campo'
import { PanelPestana, Pestanas, type Pestana } from '@/features/boveda/components/Pestanas'
import { SolicitudesMovimiento } from '@/features/boveda/components/solicitudes/SolicitudesMovimiento'
import { TarjetaBoveda } from '@/features/boveda/components/TarjetaBoveda'
import { useBovedas, useSolicitudesMovimiento } from '@/features/boveda/hooks/useBovedas'
import { accesoBoveda } from '@/features/boveda/lib/acceso'
import { campoClassName, selectClassName } from '@/features/boveda/lib/campos'
import {
  armarParametrosBovedas,
  armarParametrosSolicitudes,
  FILTROS_BOVEDAS_VACIOS,
  leerIdBoveda,
  type FiltrosBovedas,
} from '@/features/boveda/lib/filtros'
import { etiquetaTipoBoveda, formatearMonto, nivelSaldo, nombreAgencia } from '@/features/boveda/lib/formato'

type Vista = 'bovedas' | 'solicitudes'

/** Solo para el contador de la pestaña: basta el `total` de la primera página */
const PARAMS_PENDIENTES = armarParametrosSolicitudes({ idAgencia: '', estado: 'PENDIENTE' }, 1, 1)

/** BOV-01 · Bóvedas de la cooperativa con su saldo frente a los límites, y SMV-02 · cola de solicitudes de movimiento */
export function BovedasPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const acceso = accesoBoveda(roles ?? [])
  // La pestaña vive en la URL: al volver del detalle de una solicitud se sigue en la cola
  const [busqueda, setBusqueda] = useSearchParams()
  const vista: Vista = acceso.solicitudes && busqueda.get('vista') === 'solicitudes' ? 'solicitudes' : 'bovedas'
  const cambiarVista = (nueva: Vista) => setBusqueda(nueva === 'bovedas' ? {} : { vista: nueva }, { replace: true })
  const pendientes = useSolicitudesMovimiento(PARAMS_PENDIENTES, acceso.solicitudes)
  const pestanas: Pestana<Vista>[] = [
    { id: 'bovedas', texto: 'Bóvedas', Icono: Vault },
    { id: 'solicitudes', texto: 'Solicitudes de movimiento', Icono: FileClock, contador: pendientes.data?.total },
  ]
  const [filtros, setFiltros] = useState<FiltrosBovedas>(FILTROS_BOVEDAS_VACIOS)
  const bovedas = useBovedas(armarParametrosBovedas(filtros), acceso.listar)
  const agencias = useAgencias()
  const filtrado = filtros.idAgencia !== '' || filtros.tipo !== ''

  const resultado = (() => {
    if (bovedas.isError && !bovedas.data) {
      return (
        <Aviso tono="error">
          {mensajeErrorBoveda(bovedas.error, 'consultar las bóvedas')}
          <Button variant="outline" size="sm" disabled={bovedas.isFetching} onClick={() => void bovedas.refetch()} className="w-fit">
            <RefreshCw className={cn(bovedas.isFetching && 'animate-spin')} />
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (bovedas.isPending) return <Cargando texto="Cargando las bóvedas…" />
    if (bovedas.data.length === 0) {
      return (
        <Aviso>
          {filtrado ? 'Ninguna bóveda coincide con la agencia y el tipo elegidos.' : 'Todavía no hay bóvedas registradas.'}
        </Aviso>
      )
    }

    const lista = bovedas.data
    return (
      <div className={cn('flex flex-col gap-5 transition-opacity', bovedas.isFetching && 'opacity-60')}>
        {bovedas.isError && <Aviso tono="error">{mensajeErrorBoveda(bovedas.error, 'consultar las bóvedas')}</Aviso>}
        <Resumen bovedas={lista} />
        <ul className="grid gap-5 lg:grid-cols-2">
          {lista.map((boveda) => (
            <TarjetaBoveda
              key={boveda.idBoveda}
              boveda={boveda}
              agencia={nombreAgencia(boveda.idAgencia, agencias.data)}
              superior={lista.find((item) => item.idBoveda === boveda.idBovedaSuperior)?.codigoBoveda}
            />
          ))}
        </ul>
      </div>
    )
  })()

  const listado = acceso.listar ? <section aria-label="Bóvedas">{resultado}</section> : <AbrirPorId puedeMovimientos={acceso.movimientos} />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Bóvedas</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            {vista === 'solicitudes'
              ? 'Movimientos de efectivo solicitados que esperan aprobación, y cómo se resolvieron los anteriores.'
              : acceso.listar
                ? 'Efectivo que custodia cada bóveda y cómo está frente a sus límites.'
                : 'Consulta los movimientos de efectivo de una bóveda.'}
          </p>
        </div>

        {acceso.listar && vista === 'bovedas' && (
          <form aria-label="Filtrar bóvedas" onSubmit={(event) => event.preventDefault()} className="grid w-full gap-4 sm:w-auto sm:grid-cols-2">
            <Campo id="bovedas-agencia" label="Agencia" error={agencias.isError ? 'No pudimos cargar las agencias.' : undefined}>
              <select
                id="bovedas-agencia"
                value={filtros.idAgencia}
                onChange={(event) => setFiltros((actual) => ({ ...actual, idAgencia: event.target.value }))}
                className={cn(selectClassName, 'sm:w-52')}
              >
                <option value="">{agencias.isLoading ? 'Cargando agencias…' : 'Todas'}</option>
                {agencias.data.map((agencia) => (
                  <option key={agencia.idAgencia} value={agencia.idAgencia}>
                    {agencia.nombre !== agencia.idAgencia ? `${agencia.idAgencia} · ${agencia.nombre}` : agencia.idAgencia}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="bovedas-tipo" label="Tipo">
              <select
                id="bovedas-tipo"
                value={filtros.tipo}
                onChange={(event) => setFiltros((actual) => ({ ...actual, tipo: event.target.value as FiltrosBovedas['tipo'] }))}
                className={cn(selectClassName, 'sm:w-52')}
              >
                <option value="">Todos</option>
                {TIPOS_BOVEDA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {etiquetaTipoBoveda(tipo)}
                  </option>
                ))}
              </select>
            </Campo>
          </form>
        )}
      </header>

      {acceso.solicitudes && <Pestanas id="vista-bovedas" etiqueta="Secciones de bóvedas" pestanas={pestanas} activa={vista} onCambiar={cambiarVista} />}

      {acceso.solicitudes ? (
        <PanelPestana id="vista-bovedas" valor={vista}>
          {vista === 'solicitudes' ? <SolicitudesMovimiento puedeListarBovedas={acceso.listar} /> : listado}
        </PanelPestana>
      ) : (
        listado
      )}
    </div>
  )
}

/** Totales de las bóvedas que se ven en pantalla */
function Resumen({ bovedas }: { bovedas: Boveda[] }) {
  const total = bovedas.reduce((suma, boveda) => suma + boveda.saldoActual, 0)
  const fuera = bovedas.filter((boveda) => nivelSaldo(boveda) !== 'normal').length

  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      <span className="font-semibold text-heading tabular-nums">{formatearMonto(total)}</span> en{' '}
      {bovedas.length === 1 ? '1 bóveda' : `${bovedas.length} bóvedas`}
      {' · '}
      {fuera === 0 ? (
        'todas dentro de sus límites'
      ) : (
        <span className="font-medium text-destructive">{fuera === 1 ? '1 fuera de sus límites' : `${fuera} fuera de sus límites`}</span>
      )}
    </p>
  )
}

/**
 * Quien consulta movimientos (BOV-03) pero no lista bóvedas (BOV-01), como el AUDITOR, llega a la
 * bóveda por su ID: no hay otra forma de elegirla sin el listado.
 */
function AbrirPorId({ puedeMovimientos }: { puedeMovimientos: boolean }) {
  const navigate = useNavigate()
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string>()

  if (!puedeMovimientos) return <Aviso tono="error">Tu rol no tiene permiso para consultar las bóvedas.</Aviso>

  const abrir = (event: FormEvent) => {
    event.preventDefault()
    const idBoveda = leerIdBoveda(valor)
    if (idBoveda === null) return setError('Escribe el ID de la bóveda: un número entero, por ejemplo 1.')
    void navigate(`/bovedas/${idBoveda}`)
  }

  return (
    <section className="flex max-w-xl flex-col gap-6 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
      <p className="text-base text-muted-foreground">
        Tu rol consulta los movimientos, pero no el listado de bóvedas. Escribe el ID de la bóveda que quieres revisar.
      </p>
      <form onSubmit={abrir} noValidate className="flex flex-wrap items-start gap-4">
        <div className="min-w-48 flex-1">
          <Campo id="id-boveda" label="ID de la bóveda" error={error}>
            <Input
              id="id-boveda"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              placeholder="Ej.: 1"
              value={valor}
              onChange={(event) => {
                setValor(event.target.value)
                setError(undefined)
              }}
              className={campoClassName}
              aria-invalid={!!error}
              aria-describedby={error ? 'id-boveda-error' : undefined}
            />
          </Campo>
        </div>
        <Button type="submit" className="mt-[32px] h-[52px] rounded-xl px-6 text-base font-semibold">
          Ver movimientos
          <ArrowRight />
        </Button>
      </form>
    </section>
  )
}
