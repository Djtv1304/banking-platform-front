import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronUp, CircleCheck, Eye, EyeOff, X } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import type { AccionCuenta, Cuenta } from '@/features/cuenta/api/cuenta.contract'
import { useCuentasCliente } from '@/features/cuenta/hooks/useCuentas'
import {
  ACCIONES_CUENTA,
  accionesDisponibles,
  enmascararCuenta,
  ESTILOS_TIPO_CUENTA,
  formatearFecha,
  formatearMonto,
  TIPOS_CUENTA,
} from '@/features/cuenta/lib/estados'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import {
  CambiarEstadoCuentaDialog,
  type CambioEstadoSeleccion,
} from '@/features/cuenta/components/CambiarEstadoCuentaDialog'

const SALDO_OCULTO = '$ •••••'

/**
 * Cuentas del cliente (vista del personal, historia A-03). A la izquierda, las tarjetas del Home del
 * cliente en una lista con scroll; a la derecha, el detalle y las acciones de la cuenta elegida.
 */
export function CuentasCliente({ idCliente }: { idCliente: number }) {
  const { data: cuentas, isPending, isError } = useCuentasCliente(idCliente)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null)
  const [saldosOcultos, setSaldosOcultos] = useState(false)
  const [cambio, setCambio] = useState<CambioEstadoSeleccion | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const seleccionada = cuentas?.find((cuenta) => cuenta.idCuenta === idSeleccionada) ?? cuentas?.[0]

  return (
    <section aria-labelledby="cuentas-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cuentas-titulo" className="text-xl font-semibold text-heading">
            Cuentas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige una cuenta para bloquearla, inactivarla, reactivarla o cerrarla.
          </p>
        </div>
        {cuentas && cuentas.length > 0 && (
          <button
            type="button"
            onClick={() => setSaldosOcultos((valor) => !valor)}
            aria-pressed={saldosOcultos}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {saldosOcultos ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
            {saldosOcultos ? 'Mostrar saldos' : 'Ocultar saldos'}
          </button>
        )}
      </header>

      {aviso && (
        <p
          role="status"
          className="mt-5 flex items-center gap-3 rounded-xl border border-info/40 bg-info/15 px-4 py-3 text-sm text-foreground"
        >
          <CircleCheck className="size-[18px] shrink-0 text-link" />
          <span className="flex-1">{aviso}</span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </p>
      )}

      {isPending && (
        <div aria-busy="true" className="mt-5 grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
          <span className="h-36 animate-pulse rounded-2xl bg-muted" />
          <span className="h-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}

      {isError && <p className="mt-5 text-sm text-destructive">No pudimos cargar las cuentas del cliente.</p>}

      {cuentas?.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          El cliente aún no tiene cuentas.
        </p>
      )}

      {cuentas && seleccionada && (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
          <RuedaCuentas
            cuentas={cuentas}
            seleccionada={seleccionada}
            saldosOcultos={saldosOcultos}
            onSeleccionar={(cuenta) => setIdSeleccionada(cuenta.idCuenta)}
          />
          <DetalleCuenta
            cuenta={seleccionada}
            saldoOculto={saldosOcultos}
            onAccion={(accion) => setCambio({ cuenta: seleccionada, accion })}
          />
        </div>
      )}

      <CambiarEstadoCuentaDialog
        seleccion={cambio}
        onClose={() => setCambio(null)}
        onDone={(mensaje) => {
          setCambio(null)
          setAviso(mensaje)
        }}
      />
    </section>
  )
}

interface RuedaCuentasProps {
  cuentas: Cuenta[]
  seleccionada: Cuenta
  saldosOcultos: boolean
  onSeleccionar: (cuenta: Cuenta) => void
}

function RuedaCuentas({ cuentas, seleccionada, saldosOcultos, onSeleccionar }: RuedaCuentasProps) {
  const rueda = useRef<HTMLDivElement>(null)
  const indice = cuentas.findIndex((cuenta) => cuenta.idCuenta === seleccionada.idCuenta)

  /** Salto directo a una cuenta (flechas, teclado o clic en una vecina) */
  const irA = (destino: number) => {
    const contenedor = rueda.current
    const cuenta = cuentas[destino]
    const item = contenedor?.children[destino] as HTMLElement | undefined
    if (!contenedor || !cuenta || !item) return

    onSeleccionar(cuenta)
    // Durante el desplazamiento programado el snap se apaga: si no, el navegador lo detiene en
    // puntos intermedios y el salto se ve trabado. Se vuelve a encender al terminar.
    contenedor.style.scrollSnapType = 'none'
    contenedor.scrollTo({
      top: item.offsetTop + item.offsetHeight / 2 - contenedor.clientHeight / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  // Al terminar el scroll se reactiva el snap y la cuenta más cercana al centro queda seleccionada
  useEffect(() => {
    const contenedor = rueda.current
    if (!contenedor) return

    const alTerminar = () => {
      contenedor.style.scrollSnapType = ''
      const centro = contenedor.scrollTop + contenedor.clientHeight / 2
      let masCercana = 0
      let menorDistancia = Infinity
      Array.from(contenedor.children as HTMLCollectionOf<HTMLElement>).forEach((item, posicion) => {
        const distancia = Math.abs(item.offsetTop + item.offsetHeight / 2 - centro)
        if (distancia < menorDistancia) [masCercana, menorDistancia] = [posicion, distancia]
      })
      const cuenta = cuentas[masCercana]
      if (cuenta && cuenta.idCuenta !== seleccionada.idCuenta) onSeleccionar(cuenta)
    }

    // `scrollend` es lo ideal; donde no existe se espera a que el scroll se detenga
    if ('onscrollend' in window) {
      contenedor.addEventListener('scrollend', alTerminar)
      return () => contenedor.removeEventListener('scrollend', alTerminar)
    }
    let espera: ReturnType<typeof setTimeout>
    const alDesplazar = () => {
      clearTimeout(espera)
      espera = setTimeout(alTerminar, 120)
    }
    contenedor.addEventListener('scroll', alDesplazar, { passive: true })
    return () => {
      clearTimeout(espera)
      contenedor.removeEventListener('scroll', alDesplazar)
    }
  }, [cuentas, seleccionada.idCuenta, onSeleccionar])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const paso = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (!paso) return
    event.preventDefault()
    irA(Math.min(Math.max(indice + paso, 0), cuentas.length - 1))
  }

  const flecha =
    'flex h-7 w-full cursor-pointer items-center justify-center rounded-lg text-muted-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-25'

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={() => irA(indice - 1)} disabled={indice <= 0} aria-label="Cuenta anterior" className={flecha}>
        <ChevronUp className="size-4" />
      </button>

      <div
        ref={rueda}
        role="listbox"
        tabIndex={0}
        aria-label="Cuentas del cliente"
        aria-activedescendant={`cuenta-opcion-${seleccionada.idCuenta}`}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex h-64 w-full snap-y snap-mandatory flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl outline-none [perspective:900px]',
          // Centra la primera y la última cuenta: (alto de la rueda − alto de la tarjeta) / 2
          'py-[calc((16rem-9.25rem)/2)]',
          // Las vecinas se desvanecen hacia los bordes, como en iOS; sin barra de scroll
          '[mask-image:linear-gradient(to_bottom,transparent,black_24%,black_76%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
      >
        {cuentas.map((cuenta, posicion) => {
          const { Icon, className, corto } = ESTILOS_TIPO_CUENTA[cuenta.tipoCuenta]
          const activa = posicion === indice

          return (
            <div
              key={cuenta.idCuenta}
              id={`cuenta-opcion-${cuenta.idCuenta}`}
              role="option"
              aria-selected={activa}
              onClick={() => irA(posicion)}
              className={cn(
                'rueda-item relative flex h-[9.25rem] w-full shrink-0 cursor-pointer snap-center snap-always flex-col rounded-2xl p-5 shadow-sm select-none',
                cuenta.estado === 'CERRADA' ? 'bg-muted text-muted-foreground' : className,
              )}
            >
              <Icon className="pointer-events-none size-8 opacity-90" />
              <span className="mt-auto text-xl font-bold tabular-nums">
                {saldosOcultos ? SALDO_OCULTO : formatearMonto(cuenta.saldoDisponible)}
              </span>
              <span className="mt-1 truncate text-sm font-medium opacity-80">
                {corto} {enmascararCuenta(cuenta.numeroCuenta)}
              </span>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => irA(indice + 1)}
        disabled={indice >= cuentas.length - 1}
        aria-label="Cuenta siguiente"
        className={flecha}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  )
}

interface DetalleCuentaProps {
  cuenta: Cuenta
  saldoOculto: boolean
  onAccion: (accion: AccionCuenta) => void
}

/** Detalle de la cuenta elegida (único lugar donde se muestra su estado) y sus acciones */
function DetalleCuenta({ cuenta, saldoOculto, onAccion }: DetalleCuentaProps) {
  const acciones = accionesDisponibles(cuenta.estado)

  const datos = [
    { label: 'Número de cuenta', valor: cuenta.numeroCuenta },
    { label: 'Saldo disponible', valor: saldoOculto ? SALDO_OCULTO : formatearMonto(cuenta.saldoDisponible) },
    { label: 'Fecha de apertura', valor: formatearFecha(cuenta.fechaApertura) },
  ]

  return (
    <div
      role="region"
      aria-label={`Detalle de la cuenta ${cuenta.numeroCuenta}`}
      className="flex flex-col gap-6 rounded-2xl border border-border p-6"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-lg font-semibold text-heading">{TIPOS_CUENTA[cuenta.tipoCuenta]}</h3>
          <EstadoCuentaBadge estado={cuenta.estado} />
        </div>
        {cuenta.motivoEstado && cuenta.fechaEstado && (
          <p className="text-sm text-muted-foreground">
            Desde el {formatearFecha(cuenta.fechaEstado)} por {cuenta.motivoEstado.toLowerCase()}.
          </p>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        {datos.map(({ label, valor }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-heading tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-border pt-5">
        {acciones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {acciones.map((accion) => {
              const { label, Icon, critica } = ACCIONES_CUENTA[accion]
              return (
                <Button
                  key={accion}
                  variant={critica ? 'destructive' : 'outline'}
                  onClick={() => onAccion(accion)}
                  className="h-10 gap-2 rounded-xl px-4"
                >
                  <Icon />
                  {label}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Una cuenta cerrada ya no admite cambios de estado.</p>
        )}
      </div>
    </div>
  )
}
