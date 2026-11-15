import { useState, type FormEvent, type ReactNode } from 'react'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Checkbox, Input, Label } from '@/shared/ui'
import type { CupoCanal, Restricciones, SubProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { CampoAgencia as Campo, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import {
  useCuposSubProducto,
  useGuardarCupos,
  useGuardarRestricciones,
  useRestriccionesSubProducto,
} from '@/features/organizacion/hooks/useProductosAdmin'
import {
  cuposBody,
  entradasCupos,
  entradasRestricciones,
  restriccionesBody,
  type CampoCupo,
  type CupoEntrada,
} from '@/features/organizacion/lib/cupos-form'
import { mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

interface SeccionProps {
  subproducto: SubProductoAdmin
  soloLectura: boolean
  onGuardado: (mensaje: string) => void
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div>
        <h3 className="text-base font-semibold text-heading">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </section>
  )
}

function Guardar({ ocupado }: { ocupado: boolean }) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={ocupado} className="rounded-lg px-4 font-semibold">
        {ocupado ? <LoaderCircle className="animate-spin" /> : <Save />}
        Guardar sección
      </Button>
    </div>
  )
}

const CAMPOS_CUPO: { campo: CampoCupo; etiqueta: string }[] = [
  { campo: 'cupoDiarioMaximo', etiqueta: 'Cupo diario (USD)' },
  { campo: 'cupoMensualMaximo', etiqueta: 'Cupo mensual (USD)' },
  { campo: 'montoMaxTransaccion', etiqueta: 'Máximo por transacción (USD)' },
  { campo: 'maxTransaccionesDia', etiqueta: 'Transacciones por día' },
]

/** Checklist de canales; al marcar uno se configuran sus máximos */
export function SeccionCupos(props: SeccionProps) {
  const cupos = useCuposSubProducto(props.subproducto.idSubProducto)
  return (
    <Seccion
      titulo="Cupos por canal"
      descripcion="Máximos de retiros y transacciones en cada canal. Los cupos que personaliza el cliente no pueden superarlos."
    >
      {cupos.isError ? (
        <Aviso tono="error">{mensajeErrorProducto(toApiError(cupos.error))}</Aviso>
      ) : cupos.isPending ? (
        <Cargando texto="Cargando canales…" />
      ) : (
        <FormularioCupos {...props} inicial={cupos.data} />
      )}
    </Seccion>
  )
}

function FormularioCupos({ subproducto, soloLectura, onGuardado, inicial }: SeccionProps & { inicial: CupoCanal[] }) {
  const guardar = useGuardarCupos(subproducto.idSubProducto)
  const [entradas, setEntradas] = useState<CupoEntrada[]>(() => entradasCupos(inicial))
  const [errores, setErrores] = useState<Record<number, Partial<Record<CampoCupo, string>>>>({})
  const cambiar = (idCanal: number, cambio: Partial<CupoEntrada>) =>
    setEntradas((lista) => lista.map((e) => (e.idCanal === idCanal ? { ...e, ...cambio } : e)))

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const resultado = cuposBody(entradas)
    if ('errores' in resultado) return setErrores(resultado.errores)
    setErrores({})
    guardar.mutate(resultado.body, { onSuccess: () => onGuardado(`Guardamos los cupos de ${subproducto.codigoSubProducto}.`) })
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
      {inicial.map((canal) => {
        const entrada = entradas.find((e) => e.idCanal === canal.idCanal)
        if (!entrada) return null
        const id = `cupo-${canal.idCanal}`
        return (
          <div key={canal.idCanal} className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id={id}
                disabled={soloLectura}
                checked={entrada.habilitado}
                onCheckedChange={(v) => cambiar(canal.idCanal, { habilitado: v === true })}
              />
              <Label htmlFor={id} className="text-sm font-semibold text-heading">
                {canal.nombreCanal} <span className="font-normal text-muted-foreground">({canal.codigoCanal})</span>
              </Label>
            </div>
            {entrada.habilitado && (
              <div className="grid gap-3 sm:grid-cols-2">
                {CAMPOS_CUPO.map(({ campo, etiqueta }) => {
                  const idCampo = `${id}-${campo}`
                  const error = errores[canal.idCanal]?.[campo]
                  return (
                    <Campo key={campo} id={idCampo} label={etiqueta} error={error}>
                      <Input
                        id={idCampo}
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={20}
                        disabled={soloLectura}
                        className={inputClassName}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${idCampo}-error` : undefined}
                        value={entrada[campo]}
                        onChange={(e) => cambiar(canal.idCanal, { [campo]: e.target.value })}
                      />
                    </Campo>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {guardar.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(guardar.error))}</Aviso>}
      {!soloLectura && <Guardar ocupado={guardar.isPending} />}
    </form>
  )
}

/** Cuentas: días sin retiros desde la apertura y saldo mínimo */
export function SeccionRestricciones(props: SeccionProps) {
  const restricciones = useRestriccionesSubProducto(props.subproducto.idSubProducto)
  return (
    <Seccion titulo="Restricciones" descripcion="Vacío = sin esa restricción.">
      {restricciones.isError ? (
        <Aviso tono="error">{mensajeErrorProducto(toApiError(restricciones.error))}</Aviso>
      ) : restricciones.isPending ? (
        <Cargando texto="Cargando restricciones…" />
      ) : (
        <FormularioRestricciones {...props} inicial={restricciones.data} />
      )}
    </Seccion>
  )
}

function FormularioRestricciones({ subproducto, soloLectura, onGuardado, inicial }: SeccionProps & { inicial: Restricciones }) {
  const guardar = useGuardarRestricciones(subproducto.idSubProducto)
  const [entradas, setEntradas] = useState(() => entradasRestricciones(inicial))
  const [errores, setErrores] = useState<Partial<Record<keyof typeof entradas, string>>>({})

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const resultado = restriccionesBody(entradas)
    if ('errores' in resultado) return setErrores(resultado.errores)
    setErrores({})
    guardar.mutate(resultado.body, { onSuccess: () => onGuardado(`Guardamos las restricciones de ${subproducto.codigoSubProducto}.`) })
  }

  const campo = (nombre: keyof typeof entradas, etiqueta: string, ayuda: string) => (
    <Campo id={`res-${nombre}`} label={etiqueta} error={errores[nombre]} ayuda={ayuda}>
      <Input
        id={`res-${nombre}`}
        inputMode="decimal"
        autoComplete="off"
        maxLength={20}
        disabled={soloLectura}
        className={inputClassName}
        aria-invalid={!!errores[nombre]}
        aria-describedby={errores[nombre] ? `res-${nombre}-error` : undefined}
        value={entradas[nombre]}
        onChange={(e) => setEntradas((x) => ({ ...x, [nombre]: e.target.value }))}
      />
    </Campo>
  )

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {campo('saldoMinimo', 'Saldo mínimo (USD)', 'Ej.: 100.')}
        {campo('diasSinRetiros', 'Días sin retiros desde la apertura', 'Ej.: 30.')}
      </div>
      {guardar.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(guardar.error))}</Aviso>}
      {!soloLectura && <Guardar ocupado={guardar.isPending} />}
    </form>
  )
}
