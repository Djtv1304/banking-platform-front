import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Aviso, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'
import { listarTiposAntecedente, NIVELES_LAFT, RESULTADOS_RIESGO, riesgoCreateSchema, type RiesgoCreate } from '@/features/clientes/api/riesgo'

interface Props {
  nombre: string
  ocupado: boolean
  error: Error | null
  guardar: (entrada: RiesgoCreate) => Promise<void>
  cancelar: () => void
  valoresIniciales?: Partial<RiesgoCreate>
}

export function EvaluacionRiesgoForm({ nombre, ocupado, error, guardar, cancelar, valoresIniciales }: Props) {
  const [nivel, setNivel] = useState(valoresIniciales?.nivelRiesgoLAFT ?? '')
  const [pep, setPep] = useState(valoresIniciales?.esPEP === undefined ? '' : valoresIniciales.esPEP ? 'si' : 'no')
  const [antecedentes, setAntecedentes] = useState(valoresIniciales?.tieneAntecedentes === undefined ? '' : valoresIniciales.tieneAntecedentes ? 'si' : 'no')
  const [tipo, setTipo] = useState(valoresIniciales?.idTipoAntecedente ? String(valoresIniciales.idTipoAntecedente) : '')
  const [resultado, setResultado] = useState(valoresIniciales?.resultadoEvaluacion ?? '')
  const [observaciones, setObservaciones] = useState(valoresIniciales?.observaciones ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [confirmacion, setConfirmacion] = useState<RiesgoCreate | null>(null)
  const catalogo = useQuery({ queryKey: ['catalogos', 'tipos-antecedente'], queryFn: ({ signal }) => listarTiposAntecedente(signal), staleTime: Infinity, gcTime: Infinity, retry: false, enabled: antecedentes === 'si' })
  const tipoElegido = catalogo.data?.find((fila) => String(fila.idTipoAntecedente) === tipo)
  const bloqueado = ocupado || (antecedentes === 'si' && (catalogo.isPending || catalogo.isError || !catalogo.data?.length))
  const clase = `${fieldClassName} w-full border outline-none focus-visible:ring-2 focus-visible:ring-ring dark:scheme-dark`

  const requiereAprobacion = pep === 'si' || nivel === 'Alto' || resultado === 'Rechazado'
  const textoBoton = requiereAprobacion ? 'Enviar a aprobación' : 'Registrar evaluación'

  function revisar(evento: React.FormEvent) {
    evento.preventDefault()
    const entrada = riesgoCreateSchema.safeParse({ nivelRiesgoLAFT: nivel, esPEP: pep === 'si', resultadoEvaluacion: resultado, tieneAntecedentes: antecedentes === 'si', idTipoAntecedente: antecedentes === 'si' && tipo ? Number(tipo) : null, observaciones: observaciones.trim() || null })
    const campos: Record<string, string> = {}
    if (!pep) campos.esPEP = 'Indica si es una persona expuesta políticamente.'
    if (!antecedentes) campos.tieneAntecedentes = 'Indica si tiene antecedentes.'
    if (!entrada.success) for (const issue of entrada.error.issues) campos[String(issue.path[0])] = issue.message
    if (antecedentes === 'si' && !tipoElegido) campos.idTipoAntecedente = 'Selecciona un tipo disponible en el catálogo.'
    setErrores(campos)
    if (!Object.keys(campos).length && entrada.success) setConfirmacion(entrada.data)
  }

  async function confirmar() {
    if (!confirmacion || ocupado) return
    try { await guardar(confirmacion) } catch { setConfirmacion(null) }
  }

  return (
    <>
      <form onSubmit={revisar} noValidate className="flex flex-col gap-5 rounded-xl border border-border bg-field/30 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">Registra la evaluación realizada por el personal autorizado. Cada registro se conserva en el historial.</p>
        <fieldset disabled={ocupado} className="grid min-w-0 gap-5 sm:grid-cols-2">
          <Field id="riesgo-nivel" label="Nivel de riesgo LAFT" error={errores.nivelRiesgoLAFT}>
            <select id="riesgo-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} className={clase} aria-invalid={!!errores.nivelRiesgoLAFT} aria-describedby={errores.nivelRiesgoLAFT ? 'riesgo-nivel-error' : undefined}><option value="">Seleccionar nivel</option>{NIVELES_LAFT.map((valor) => <option key={valor}>{valor}</option>)}</select>
          </Field>
          <Field id="riesgo-pep" label="Persona expuesta políticamente (PEP)" error={errores.esPEP}>
            <select id="riesgo-pep" value={pep} onChange={(e) => setPep(e.target.value)} className={clase} aria-invalid={!!errores.esPEP} aria-describedby={errores.esPEP ? 'riesgo-pep-error' : undefined}><option value="">Seleccionar respuesta</option><option value="no">No</option><option value="si">Sí</option></select>
          </Field>
          <Field id="riesgo-antecedentes" label="Tiene antecedentes" error={errores.tieneAntecedentes}>
            <select id="riesgo-antecedentes" value={antecedentes} onChange={(e) => { setAntecedentes(e.target.value); setTipo(''); setErrores((actual) => ({ ...actual, idTipoAntecedente: '' })) }} className={clase} aria-invalid={!!errores.tieneAntecedentes} aria-describedby={errores.tieneAntecedentes ? 'riesgo-antecedentes-error' : undefined}><option value="">Seleccionar respuesta</option><option value="no">No</option><option value="si">Sí</option></select>
          </Field>
          {antecedentes === 'si' && <Field id="riesgo-tipo" label="Tipo de antecedente" error={errores.idTipoAntecedente}>
            <select id="riesgo-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!catalogo.data?.length || catalogo.isError} className={clase} aria-invalid={!!errores.idTipoAntecedente} aria-describedby={errores.idTipoAntecedente ? 'riesgo-tipo-error' : undefined}><option value="">Seleccionar antecedente</option>{catalogo.data?.map((fila) => <option key={fila.idTipoAntecedente} value={fila.idTipoAntecedente}>{fila.nombre}</option>)}</select>
            {catalogo.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando tipos de antecedente…</p>}
            {catalogo.isError && <div role="alert" className="text-sm text-destructive"><p>{catalogo.error.message}</p><Button type="button" variant="outline" onClick={() => void catalogo.refetch()}>Reintentar catálogo</Button></div>}
            {catalogo.isSuccess && !catalogo.data.length && <p role="status" className="text-sm text-muted-foreground">El catálogo está vacío. Solicita al equipo que revise los tipos disponibles.</p>}
            {tipoElegido?.puedeImpedirVinculacion && <p className="text-sm text-muted-foreground">Este antecedente puede impedir la vinculación. Revisa el resultado conforme a la política de cumplimiento.</p>}
          </Field>}
          <Field id="riesgo-resultado" label="Resultado de la evaluación" error={errores.resultadoEvaluacion}>
            <select id="riesgo-resultado" value={resultado} onChange={(e) => setResultado(e.target.value)} className={clase} aria-invalid={!!errores.resultadoEvaluacion} aria-describedby={errores.resultadoEvaluacion ? 'riesgo-resultado-error' : undefined}><option value="">Seleccionar resultado</option>{RESULTADOS_RIESGO.map((valor) => <option key={valor}>{valor}</option>)}</select>
          </Field>
          <Field id="riesgo-observaciones" label="Observaciones" optional error={errores.observaciones} className="sm:col-span-2">
            <textarea id="riesgo-observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={250} rows={3} className="w-full rounded-xl border border-border bg-field p-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={!!errores.observaciones} aria-describedby="riesgo-observaciones-ayuda" />
            <p id="riesgo-observaciones-ayuda" className="text-sm text-muted-foreground">{observaciones.length}/250 caracteres. Incluye el sustento de la evaluación.</p>
          </Field>
        </fieldset>
        {requiereAprobacion && (
          <Aviso>
            <p>
              Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.
              {resultado === 'Rechazado' && ' Si se aprueba, el cliente quedará bloqueado.'}
            </p>
          </Aviso>
        )}
        {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive"><p>{error.message}</p><p className="mt-2">Los datos se conservaron. Si hubo una interrupción, consulta el historial antes de reenviar.</p></div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" size="form" disabled={ocupado} onClick={cancelar}>
            Cancelar
          </Button>
          <Button type="submit" size="form" disabled={bloqueado}>
            {ocupado ? 'Guardando…' : textoBoton}
          </Button>
        </div>
      </form>
      <Dialog open={confirmacion !== null} onOpenChange={(abierto) => { if (!abierto && !ocupado) setConfirmacion(null) }}>
        <DialogContent showCloseButton={!ocupado}>
          <DialogHeader><DialogTitle>Confirmar evaluación de riesgo</DialogTitle><DialogDescription>Se registrará para {nombre}. El resultado puede cambiar el estado del cliente.</DialogDescription></DialogHeader>
          {confirmacion && <dl className="grid gap-2 text-sm"><dt className="font-semibold">Resultado</dt><dd>{confirmacion.resultadoEvaluacion}</dd><dt className="font-semibold">Riesgo LAFT</dt><dd>{confirmacion.nivelRiesgoLAFT}</dd><dt className="font-semibold">PEP y antecedentes</dt><dd>PEP {confirmacion.esPEP ? 'Sí' : 'No'} · Antecedentes {confirmacion.tieneAntecedentes ? 'Sí' : 'No'}</dd></dl>}
          {requiereAprobacion && (
            <p className="text-sm text-muted-foreground">
              Esta evaluación requiere la aprobación de otra persona y no rige hasta entonces.
              {resultado === 'Rechazado' && ' Si se aprueba, el cliente quedará bloqueado.'}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" size="form" disabled={ocupado} onClick={() => setConfirmacion(null)}>
              Volver al formulario
            </Button>
            <Button type="button" size="form" disabled={ocupado} onClick={() => void confirmar()}>
              {ocupado ? 'Guardando…' : textoBoton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
