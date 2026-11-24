import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type { EstadoGrillaAsiento } from '@/features/contabilidad/hooks/useGrillaAsiento'
import {
  cuentaDeTexto,
  estadoCuadre,
  focoTrasQuitar,
  idCelda,
  lineaVacia,
  MINIMO_LINEAS,
  opcionCuenta,
  type CampoLinea,
  type LineaBorrador,
} from '@/features/contabilidad/lib/grilla-asiento'
import { cn } from '@/shared/lib'
import { formatearDolares } from '@/shared/lib/monto'
import { Button, Input, MontoInput } from '@/shared/ui'

interface GrillaAsientoProps {
  id: string
  grilla: EstadoGrillaAsiento
  /** Tras el primer intento de guardar: muestra los errores de todas las líneas, no sólo las tocadas */
  mostrarErrores?: boolean
  deshabilitada?: boolean
}

type Tocado = `${string}:${'cuenta' | 'monto'}`

const celdaClase = 'px-2 py-2 align-top'
const inputClase = 'h-10 rounded-xl border-border bg-field text-base md:text-base dark:bg-field dark:scheme-dark'

/**
 * E4-04 · Editor de líneas de un asiento manual, usable sólo con teclado: Tab recorre cuenta, debe,
 * haber y «Quitar»; Enter en el debe o el haber baja a la línea siguiente o agrega una al final.
 * Los totales y el cuadre se anuncian con aria-live.
 */
export function GrillaAsiento({ id, grilla, mostrarErrores = false, deshabilitada = false }: GrillaAsientoProps) {
  const { lineas, despachar, indice, elegibles, resumen } = grilla
  const [tocados, setTocados] = useState<ReadonlySet<Tocado>>(() => new Set())
  const focoPendiente = useRef<string | null>(null)
  const listaId = `${id}-cuentas`

  useEffect(() => {
    if (!focoPendiente.current) return
    document.getElementById(focoPendiente.current)?.focus()
    focoPendiente.current = null
  })

  const tocar = (clave: string, campo: 'cuenta' | 'monto') =>
    setTocados(previos => (previos.has(`${clave}:${campo}`) ? previos : new Set(previos).add(`${clave}:${campo}`)))

  const agregar = (despuesDe?: string) => {
    const linea = lineaVacia()
    focoPendiente.current = idCelda(id, linea.clave, 'cuenta')
    despachar({ tipo: 'agregar', linea, despuesDe })
  }

  const quitar = (clave: string) => {
    const destino = focoTrasQuitar(lineas, clave)
    if (destino) focoPendiente.current = idCelda(id, destino, 'cuenta')
    despachar({ tipo: 'quitar', clave })
  }

  const cambiar = (clave: string, campo: CampoLinea, valor: string) => despachar({ tipo: 'cambiar', clave, campo, valor })

  const alPulsarEnMonto = (event: KeyboardEvent<HTMLInputElement>, posicion: number) => {
    if (event.key !== 'Enter') return
    // Que Enter no envíe el formulario: pasa a la línea siguiente o agrega una
    event.preventDefault()
    const siguiente = lineas[posicion + 1]
    if (siguiente) document.getElementById(idCelda(id, siguiente.clave, 'cuenta'))?.focus()
    else agregar(lineas[posicion].clave)
  }

  const { totales } = resumen
  const puedeQuitar = lineas.length > MINIMO_LINEAS && !deshabilitada

  return (
    <div className="flex flex-col gap-3">
      <datalist id={listaId}>
        {elegibles.map(cuenta => (
          <option key={cuenta.idCuentaContable} value={opcionCuenta(cuenta)} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Líneas del asiento: cada una con su cuenta y un monto en el debe o en el haber</caption>
          <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="w-12 px-2 py-2 text-center">N.º</th>
              <th scope="col" className="px-2 py-2">Cuenta</th>
              <th scope="col" className="w-40 px-2 py-2 text-right">Debe</th>
              <th scope="col" className="w-40 px-2 py-2 text-right">Haber</th>
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, posicion) => (
              <FilaLinea
                key={linea.clave}
                idGrilla={id}
                listaId={listaId}
                linea={linea}
                numero={posicion + 1}
                errores={resumen.errores.get(linea.clave)}
                verCuenta={mostrarErrores || tocados.has(`${linea.clave}:cuenta`)}
                verMonto={mostrarErrores || tocados.has(`${linea.clave}:monto`)}
                nombreCuenta={nombreResuelto(linea, indice)}
                deshabilitada={deshabilitada}
                puedeQuitar={puedeQuitar}
                onCambiar={(campo, valor) => cambiar(linea.clave, campo, valor)}
                onTocar={campo => tocar(linea.clave, campo)}
                onEnterMonto={event => alPulsarEnMonto(event, posicion)}
                onQuitar={() => quitar(linea.clave)}
              />
            ))}
          </tbody>
          <tfoot className="border-t border-border font-semibold text-heading">
            <tr>
              <th scope="row" colSpan={2} className="px-2 py-2 text-right">Totales</th>
              <td className="px-2 py-2 text-right tabular-nums">{formatearDolares(totales.debe)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatearDolares(totales.haber)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          id={`${id}-cuadre`}
          role="status"
          aria-live="polite"
          className={cn('text-sm font-medium', totales.cuadra ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}
        >
          {estadoCuadre(totales)}
        </p>
        <Button type="button" variant="outline" onClick={() => agregar()} disabled={deshabilitada}>
          <Plus aria-hidden />
          Agregar línea
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Escribe el código o busca la cuenta por su nombre. Enter en el debe o el haber pasa a la línea siguiente; en la
        última, agrega una nueva.
      </p>
    </div>
  )
}

/** Nombre de la cuenta debajo del campo cuando sólo se escribió el código */
function nombreResuelto(linea: LineaBorrador, indice: EstadoGrillaAsiento['indice']) {
  const cuenta = cuentaDeTexto(linea.cuenta, indice)
  if (!cuenta || linea.cuenta.trim() === opcionCuenta(cuenta)) return undefined
  return cuenta.nombreCuenta
}

interface FilaLineaProps {
  idGrilla: string
  listaId: string
  linea: LineaBorrador
  numero: number
  errores?: { cuenta?: string; monto?: string }
  verCuenta: boolean
  verMonto: boolean
  nombreCuenta?: string
  deshabilitada: boolean
  puedeQuitar: boolean
  onCambiar: (campo: CampoLinea, valor: string) => void
  onTocar: (campo: 'cuenta' | 'monto') => void
  onEnterMonto: (event: KeyboardEvent<HTMLInputElement>) => void
  onQuitar: () => void
}

function FilaLinea({
  idGrilla,
  listaId,
  linea,
  numero,
  errores,
  verCuenta,
  verMonto,
  nombreCuenta,
  deshabilitada,
  puedeQuitar,
  onCambiar,
  onTocar,
  onEnterMonto,
  onQuitar,
}: FilaLineaProps) {
  const errorCuenta = verCuenta ? errores?.cuenta : undefined
  const errorMonto = verMonto ? errores?.monto : undefined
  const idErrorCuenta = `${idCelda(idGrilla, linea.clave, 'error')}-cuenta`
  const idErrorMonto = `${idCelda(idGrilla, linea.clave, 'error')}-monto`
  const idNombre = idCelda(idGrilla, linea.clave, 'nombre')
  const describeCuenta = [errorCuenta && idErrorCuenta, !errorCuenta && nombreCuenta && idNombre].filter(Boolean).join(' ') || undefined
  const describeMonto = errorMonto ? idErrorMonto : undefined

  return (
    <tr className="border-t border-border first:border-t-0">
      <td className={cn(celdaClase, 'pt-4 text-center text-muted-foreground tabular-nums')}>{numero}</td>
      <td className={celdaClase}>
        <Input
          id={idCelda(idGrilla, linea.clave, 'cuenta')}
          list={listaId}
          value={linea.cuenta}
          autoComplete="off"
          spellCheck={false}
          placeholder="Código o nombre de la cuenta"
          aria-label={`Cuenta de la línea ${numero}`}
          aria-invalid={errorCuenta ? true : undefined}
          aria-describedby={describeCuenta}
          disabled={deshabilitada}
          className={inputClase}
          onChange={event => onCambiar('cuenta', event.target.value)}
          onBlur={() => onTocar('cuenta')}
        />
        {errorCuenta ? (
          <p id={idErrorCuenta} className="mt-1 text-sm text-destructive">{errorCuenta}</p>
        ) : (
          nombreCuenta && <p id={idNombre} className="mt-1 text-xs text-muted-foreground">{nombreCuenta}</p>
        )}
      </td>
      {(['debe', 'haber'] as const).map(campo => (
        <td key={campo} className={celdaClase}>
          <MontoInput
            id={idCelda(idGrilla, linea.clave, campo)}
            value={linea[campo]}
            aria-label={`${campo === 'debe' ? 'Debe' : 'Haber'} de la línea ${numero}`}
            aria-invalid={errorMonto ? true : undefined}
            aria-describedby={describeMonto}
            disabled={deshabilitada}
            className={inputClase}
            onChange={valor => onCambiar(campo, valor)}
            onBlur={() => onTocar('monto')}
            onKeyDown={onEnterMonto}
          />
          {campo === 'debe' && errorMonto && (
            <p id={idErrorMonto} className="mt-1 text-sm text-destructive">{errorMonto}</p>
          )}
        </td>
      ))}
      <td className={cn(celdaClase, 'pt-3')}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Quitar la línea ${numero}`}
          title={puedeQuitar ? `Quitar la línea ${numero}` : 'El asiento necesita al menos dos líneas'}
          disabled={!puedeQuitar}
          onClick={onQuitar}
        >
          <Trash2 aria-hidden />
        </Button>
      </td>
    </tr>
  )
}
