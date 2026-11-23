import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { obtenerContextoAgencias } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import { CONCEPTO_ASIENTO_MAXIMO } from '@/features/contabilidad/api/asientos.contract'
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { GrillaAsiento } from '@/features/contabilidad/components/GrillaAsiento'
import { useAsiento } from '@/features/contabilidad/hooks/useAsientos'
import { useEnviarAsiento, useGuardarAsiento } from '@/features/contabilidad/hooks/useAsientoManual'
import { useGrillaAsiento } from '@/features/contabilidad/hooks/useGrillaAsiento'
import { usePlanCuentas } from '@/features/contabilidad/hooks/usePlanCuentas'
import {
  cuerpoAsiento,
  detalleErroresAsiento,
  errorAgencia,
  errorConcepto,
  esBorrador,
  idDeRuta,
  mensajeErrorAsientoManual,
} from '@/features/contabilidad/lib/asiento-manual'
import { etiquetaAgencia, etiquetaEstadoAsiento, mensajeErrorAsientos } from '@/features/contabilidad/lib/asientos'
import { indiceDeCuentas, lineasDeAsiento, lineasParaBorrador, lineasParaEnviar } from '@/features/contabilidad/lib/grilla-asiento'
import { mensajeErrorPlanCuentas } from '@/features/contabilidad/lib/mensajes'
import { toApiError, type ApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Label, Textarea } from '@/shared/ui'

const tarjeta = 'rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8'

/** E4-04 · Registrar (o seguir editando) un asiento manual y enviarlo a aprobación */
export function NuevoAsientoPage() {
  const { idAsiento: parametro } = useParams()
  const id = idDeRuta(parametro)
  const plan = usePlanCuentas()
  const asiento = useAsiento(id ?? null)
  const enviado = enviadoDeNavegacion(useLocation().state)

  const contenido = (() => {
    if (id === undefined) return <Aviso tono="error">El enlace del asiento no es válido.</Aviso>
    // Antes que el aviso de «sólo borradores»: tras enviar, el asiento recargado ya no es borrador
    if (enviado) return <AsientoEnviado pendiente={enviado.pendiente} />
    if (plan.isError) return <Aviso tono="error">{mensajeErrorPlanCuentas(toApiError(plan.error), 'consulta')}</Aviso>
    if (id !== null && asiento.isError) return <Aviso tono="error">{mensajeErrorAsientos(toApiError(asiento.error))}</Aviso>
    if (plan.isPending || (id !== null && asiento.isPending)) return <Cargando texto="Preparando el asiento…" />
    if (asiento.data && !esBorrador(asiento.data.estado)) {
      return (
        <Aviso>
          Sólo se editan los borradores. El asiento {asiento.data.numeroAsiento} está «{etiquetaEstadoAsiento(asiento.data.estado)}».
        </Aviso>
      )
    }
    return <FormularioAsiento key={id ?? 'nuevo'} plan={plan.data} asiento={id === null ? undefined : asiento.data} />
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to="/contabilidad/asientos" className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
          ← Asientos contables
        </Link>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">
          {enviado ? 'Asiento manual' : id ? 'Editar borrador de asiento' : 'Nuevo asiento manual'}
        </h1>
        <p className="text-base text-muted-foreground">
          Registra las líneas, revisa que el debe y el haber cuadren y envíalo a aprobación. Otra persona lo aprueba en
          Aprobaciones; mientras tanto no afecta los saldos.
        </p>
      </header>
      {contenido}
    </div>
  )
}

type Resultado = { tipo: 'guardado' } | { tipo: 'error'; error: ApiError }

/**
 * El envío se anuncia en el estado de la navegación y no en el del formulario: al enviar, el asiento
 * recargado deja de ser borrador (el padre cambia de vista) y, desde «nuevo», la ruta cambia de `key`.
 */
function enviadoDeNavegacion(estado: unknown): { pendiente: boolean } | null {
  if (typeof estado !== 'object' || estado === null || !('enviado' in estado)) return null
  const { enviado } = estado as { enviado: unknown }
  if (typeof enviado !== 'object' || enviado === null || !('pendiente' in enviado)) return null
  return { pendiente: (enviado as { pendiente: unknown }).pendiente === true }
}

function AsientoEnviado({ pendiente }: { pendiente: boolean }) {
  return (
    <section className={cn(tarjeta, 'flex flex-col gap-4')} aria-labelledby="asiento-enviado">
      <h2 id="asiento-enviado" className="text-xl font-semibold text-heading">
        {pendiente ? 'Asiento enviado a aprobación' : 'Asiento registrado'}
      </h2>
      <p className="text-muted-foreground">
        {pendiente
          ? 'Queda pendiente hasta que otra persona lo apruebe en Aprobaciones. Al aprobarlo se contabiliza con su número, quién lo registró y quién lo aprobó.'
          : 'El servidor lo registró sin pasar por aprobación.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/aprobaciones">Ver aprobaciones</Link></Button>
        <Button asChild variant="outline"><Link to="/contabilidad/asientos">Volver a asientos</Link></Button>
      </div>
    </section>
  )
}

function FormularioAsiento({ plan, asiento }: { plan: CuentaContable[]; asiento?: Asiento }) {
  const navigate = useNavigate()
  const [iniciales] = useState(() => (asiento ? lineasDeAsiento(asiento.detalle, indiceDeCuentas(plan)) : undefined))
  const grilla = useGrillaAsiento(plan, iniciales)
  const [idAsiento, setIdAsiento] = useState<number | null>(asiento?.idAsientoContable ?? null)
  const [concepto, setConcepto] = useState(asiento?.concepto ?? '')
  const [agenciaElegida, setAgenciaElegida] = useState(asiento?.idAgencia ?? '')
  const [intentado, setIntentado] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const guardar = useGuardarAsiento()
  const enviar = useEnviarAsiento()

  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  const agencias = useAgencias()
  const libre = !!contexto.data?.alcanceGlobal || !!contexto.data?.accesoTodasAgencias
  const opcionesAgencia = useMemo(() => {
    const permitidas = new Set(contexto.data?.agenciasPermitidas.map(a => a.idAgencia))
    return agencias.data.filter(a => libre || permitidas.has(a.idAgencia))
  }, [agencias.data, contexto.data, libre])
  const idAgencia = agenciaElegida || contexto.data?.idAgencia || ''

  const fallaConcepto = errorConcepto(concepto)
  const fallaAgencia = errorAgencia(idAgencia)
  const ocupado = guardar.isPending || enviar.isPending
  const motivoNoEnviar = fallaConcepto ?? fallaAgencia ?? grilla.resumen.motivoNoEnviar
  const puedeEnviar = !motivoNoEnviar && !ocupado

  const guardarBorrador = async (lineas: NonNullable<ReturnType<typeof lineasParaBorrador>>, navegar = true) => {
    const id = await guardar.mutateAsync({ idAsiento, asiento: cuerpoAsiento(concepto, idAgencia, lineas) })
    if (idAsiento === null) {
      setIdAsiento(id)
      if (!navegar) return id
      void navigate(`/contabilidad/asientos/${id}/editar`, { replace: true })
    }
    return id
  }

  const alGuardar = async () => {
    setIntentado(true)
    const lineas = lineasParaBorrador(grilla.lineas, grilla.indice)
    if (fallaConcepto || fallaAgencia || !lineas) return
    try {
      await guardarBorrador(lineas)
      setResultado({ tipo: 'guardado' })
    } catch (error) {
      setResultado({ tipo: 'error', error: toApiError(error) })
    }
  }

  const alEnviar = async () => {
    setIntentado(true)
    const lineas = lineasParaEnviar(grilla.lineas, grilla.indice)
    if (!puedeEnviar || !lineas) return
    try {
      // Sin navegar entre guardar y enviar: desde «nuevo» eso desmontaría el formulario a mitad del envío
      const id = await guardarBorrador(lineas, false)
      const { pendiente } = await enviar.mutateAsync(id)
      void navigate(`/contabilidad/asientos/${id}/editar`, { replace: true, state: { enviado: { pendiente } } })
    } catch (error) {
      setResultado({ tipo: 'error', error: toApiError(error) })
    }
  }

  const idConcepto = 'asiento-concepto'
  const idAgenciaCampo = 'asiento-agencia'
  const verConcepto = intentado && fallaConcepto
  const verAgencia = intentado && fallaAgencia

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={event => event.preventDefault()} aria-label="Asiento manual">
      <section className={cn(tarjeta, 'grid gap-5 md:grid-cols-[2fr_1fr]')} aria-label="Datos del asiento">
        <div className="flex flex-col gap-2">
          <Label htmlFor={idConcepto} className="text-sm font-semibold text-heading">Concepto</Label>
          <Textarea
            id={idConcepto}
            value={concepto}
            maxLength={CONCEPTO_ASIENTO_MAXIMO}
            rows={2}
            disabled={ocupado}
            aria-required
            aria-invalid={verConcepto ? true : undefined}
            aria-describedby={verConcepto ? `${idConcepto}-error` : `${idConcepto}-ayuda`}
            className="rounded-xl border-border bg-field text-base md:text-base dark:bg-field"
            onChange={event => setConcepto(event.target.value)}
          />
          {verConcepto ? (
            <p id={`${idConcepto}-error`} className="text-sm text-destructive">{fallaConcepto}</p>
          ) : (
            <p id={`${idConcepto}-ayuda`} className="text-xs text-muted-foreground">
              Por qué se registra el asiento. {concepto.trim().length}/{CONCEPTO_ASIENTO_MAXIMO}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={idAgenciaCampo} className="text-sm font-semibold text-heading">Agencia</Label>
          <select
            id={idAgenciaCampo}
            value={idAgencia}
            disabled={ocupado || (!libre && opcionesAgencia.length <= 1)}
            aria-required
            aria-invalid={verAgencia ? true : undefined}
            aria-describedby={verAgencia ? `${idAgenciaCampo}-error` : `${idAgenciaCampo}-ayuda`}
            className="h-11 w-full rounded-xl border border-border bg-field px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70 dark:scheme-dark"
            onChange={event => setAgenciaElegida(event.target.value)}
          >
            <option value="">Elige la agencia</option>
            {opcionesAgencia.map(agencia => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>{etiquetaAgencia(agencia)}</option>
            ))}
          </select>
          {verAgencia ? (
            <p id={`${idAgenciaCampo}-error`} className="text-sm text-destructive">{fallaAgencia}</p>
          ) : (
            <p id={`${idAgenciaCampo}-ayuda`} className="text-xs text-muted-foreground">
              La fecha la pone el sistema: la fecha contable vigente.
            </p>
          )}
        </div>
      </section>

      <section className={tarjeta} aria-labelledby="asiento-lineas">
        <h2 id="asiento-lineas" className="mb-4 text-xl font-semibold text-heading">Líneas</h2>
        <GrillaAsiento id="asiento" grilla={grilla} mostrarErrores={intentado} deshabilitada={ocupado} />
      </section>

      {resultado?.tipo === 'guardado' && <Aviso>Borrador guardado. Puedes seguir editándolo o enviarlo a aprobación.</Aviso>}
      {resultado?.tipo === 'error' && (
        <Aviso tono="error">
          <span>{mensajeErrorAsientoManual(resultado.error, 'guardar')}</span>
          {detalleErroresAsiento(resultado.error).length > 0 && (
            <ul className="list-disc pl-5">
              {detalleErroresAsiento(resultado.error).map(texto => <li key={texto}>{texto}</li>)}
            </ul>
          )}
        </Aviso>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {motivoNoEnviar && (
          <p id="asiento-motivo" className="text-sm text-muted-foreground sm:mr-auto">{motivoNoEnviar}</p>
        )}
        <Button type="button" variant="outline" onClick={() => void alGuardar()} disabled={ocupado}>
          {guardar.isPending && !enviar.isPending ? 'Guardando…' : 'Guardar borrador'}
        </Button>
        <Button
          type="button"
          onClick={() => void alEnviar()}
          disabled={!puedeEnviar}
          aria-describedby={motivoNoEnviar ? 'asiento-motivo' : undefined}
        >
          {enviar.isPending ? 'Enviando…' : 'Enviar a aprobación'}
        </Button>
      </div>
    </form>
  )
}
