import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, FechaInput, Input } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { comprobarDocumento } from '@/features/clientes/api/documentos-identidad'
import { usePaises } from '@/features/catalogos/hooks/useCatalogos'
import { Field, FormSection, SelectField, fieldClassName } from '@/features/clientes/components/form-fields'
import type { AltaTutor } from '@/features/clientes/api/tutores'

export type BorradorTutor = Omit<AltaTutor, 'idClienteRelacionado'> & {
  idClienteRelacionado: number | null
  documento: string
  documentoConsulta: { tipo: string; numero: string; pais: string }
}

const DOCUMENTO_VACIO = { tipo: 'CED', numero: '', pais: '' }
const TIPOS_DOCUMENTO = [
  { value: 'CED', label: 'Cédula' },
  { value: 'PAS', label: 'Pasaporte' },
] as const

export function TutorAltaCliente({ datos, cambiar, fechaActual }: {
  datos: BorradorTutor
  cambiar: (actualizar: (actual: BorradorTutor) => BorradorTutor) => void
  fechaActual: string
}) {
  const consulta = datos.documentoConsulta ?? DOCUMENTO_VACIO
  const { tipo, numero, pais } = consulta
  const [aviso, setAviso] = useState('')
  const paises = usePaises()
  const busqueda = useMutation({ mutationFn: comprobarDocumento, retry: false })
  const inFlight = useRef(false)
  const localizar = async () => {
    if (!numero.trim() || (tipo === 'PAS' && !pais) || inFlight.current) return
    inFlight.current = true
    const doc = numero.trim().toUpperCase()
    cambiar(actual => ({ ...actual, idClienteRelacionado: null, documento: '' }))
    setAviso('')
    try {
      const r = await busqueda.mutateAsync({
        tipoDocumento: tipo, numero: doc, ...(tipo === 'PAS' ? { codigoPaisEmision: pais } : {}),
      })
      if (r.valida && r.existe && r.idCliente && r.tipoCoincidencia === 'EXACTA' &&
          r.estadoDocumento === 'VIGENTE') {
        const idClienteRelacionado = r.idCliente
        cambiar(actual => actual.documentoConsulta === consulta
          ? { ...actual, idClienteRelacionado, documento: doc.slice(-4) }
          : actual)
      } else {
        setAviso(r.existe
          ? 'Presenta un documento vigente con coincidencia exacta.'
          : 'No encontramos un tutor con ese documento.')
      }
    } catch (error) {
      setAviso(toApiError(error).message)
    } finally {
      inFlight.current = false
    }
  }
  const cambiarDocumento = (cambio: Partial<BorradorTutor['documentoConsulta']>) => {
    setAviso('')
    cambiar(actual => ({
      ...actual,
      documentoConsulta: { ...(actual.documentoConsulta ?? DOCUMENTO_VACIO), ...cambio },
      idClienteRelacionado: null,
      documento: '',
    }))
  }
  return (
    <div className="flex flex-col gap-10">
      <FormSection title="Tutor del menor" description="Busca una persona natural adulta y activa por su documento.">
        <fieldset disabled={busqueda.isPending} className="grid min-w-0 gap-6 sm:grid-cols-2">
          <Field id="tipo-documento-tutor" label="Tipo de documento del tutor">
            <SelectField id="tipo-documento-tutor" value={tipo} onChange={tipo => cambiarDocumento({ tipo })}
              options={TIPOS_DOCUMENTO} placeholder="Selecciona el documento" disabled={busqueda.isPending} />
          </Field>
          <Field id="numero-documento-tutor" label="Número de documento del tutor">
            <Input id="numero-documento-tutor" className={fieldClassName} value={numero} maxLength={20}
              onChange={e => cambiarDocumento({ numero: e.target.value })} />
          </Field>
          {tipo === 'PAS' && (
            <Field id="emisor-documento-tutor" label="País emisor del pasaporte del tutor">
              <SelectField id="emisor-documento-tutor" value={pais} onChange={pais => cambiarDocumento({ pais })}
                options={paises.data.map(p => ({ value: p.codigoPais, label: p.nombrePais }))}
                placeholder="Selecciona el país emisor" disabled={busqueda.isPending} />
              {paises.isError && (
                <button type="button" className="self-start text-link underline" onClick={() => void paises.refetch()}>
                  Reintentar países
                </button>
              )}
            </Field>
          )}
          <div className="flex flex-col items-start gap-3 sm:col-span-2">
            <Button type="button" variant="outline" className="h-[52px] w-full rounded-xl px-6 text-base sm:w-auto"
              onClick={() => void localizar()} disabled={!numero.trim() || (tipo === 'PAS' && !pais)}>
              {busqueda.isPending ? 'Buscando…' : 'Buscar tutor'}
            </Button>
            {datos.idClienteRelacionado !== null && (
              <p role="status" className="text-sm text-muted-foreground">Tutor seleccionado · documento terminado en {datos.documento}</p>
            )}
            {aviso && <p role="alert" className="text-sm text-destructive">{aviso}</p>}
          </div>
        </fieldset>
      </FormSection>
      <FormSection title="Respaldo del tutor">
        <fieldset disabled={busqueda.isPending} className="grid min-w-0 gap-6 sm:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <div className="w-full min-w-0 max-w-lg sm:flex-1 sm:basis-80">
              <FechaInput id="fecha-tutor-alta" label="Fecha efectiva del respaldo" value={datos.fechaEfectiva}
                onChange={fechaEfectiva => cambiar(actual => ({ ...actual, fechaEfectiva }))} onBlur={() => {}}
                inputClassName={fieldClassName} required />
            </div>
            <Button type="button" variant="outline" className="h-[52px] w-full rounded-xl px-6 text-base sm:w-auto"
              onClick={() => cambiar(actual => ({ ...actual, fechaEfectiva: fechaActual }))}>
              Usar fecha de hoy
            </Button>
          </div>
          <Field id="tipo-respaldo-tutor" label="Tipo de respaldo">
            <Input id="tipo-respaldo-tutor" className={fieldClassName} value={datos.tipoRespaldo} maxLength={80}
              onChange={e => {
                const tipoRespaldo = e.target.value
                cambiar(actual => ({ ...actual, tipoRespaldo }))
              }} />
          </Field>
          <Field id="referencia-respaldo-tutor" label="Referencia o descripción del respaldo">
            <Input id="referencia-respaldo-tutor" className={fieldClassName} value={datos.referenciaRespaldo} maxLength={250}
              onChange={e => {
                const referenciaRespaldo = e.target.value
                cambiar(actual => ({ ...actual, referenciaRespaldo }))
              }} />
          </Field>
        </fieldset>
      </FormSection>
    </div>
  )
}
