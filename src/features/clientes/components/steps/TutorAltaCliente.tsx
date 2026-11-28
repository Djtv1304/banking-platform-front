import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, FechaInput, Input } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { comprobarDocumento } from '@/features/clientes/api/documentos-identidad'
import { usePaises } from '@/features/catalogos/hooks/useCatalogos'
import { FormSection } from '@/features/clientes/components/form-fields'
import type { AltaTutor } from '@/features/clientes/api/tutores'

export type BorradorTutor = Omit<AltaTutor, 'idClienteRelacionado'> & {
  idClienteRelacionado: number | null
  documento: string
  documentoConsulta: { tipo: string; numero: string; pais: string }
}

const DOCUMENTO_VACIO = { tipo: 'CED', numero: '', pais: '' }

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
    <FormSection title="Tutor del menor" description="Busca una persona natural adulta y activa por su documento.">
      <fieldset disabled={busqueda.isPending} className="grid gap-4">
        <label htmlFor="tipo-documento-tutor">Documento del tutor
          <select id="tipo-documento-tutor" value={tipo} className="block w-full rounded-lg border border-border bg-field p-2"
            onChange={e => cambiarDocumento({ tipo: e.target.value })}>
            <option value="CED">Cédula</option><option value="PAS">Pasaporte</option>
          </select>
        </label>
        <label>Número del documento del tutor<Input value={numero} maxLength={20}
          onChange={e => cambiarDocumento({ numero: e.target.value })} /></label>
        {tipo === 'PAS' && <div>
          <label htmlFor="emisor-documento-tutor">País emisor del pasaporte del tutor
            <select id="emisor-documento-tutor" value={pais} className="block w-full rounded-lg border border-border bg-field p-2"
              onChange={e => cambiarDocumento({ pais: e.target.value })}>
              <option value="">Selecciona un país</option>
              {paises.data.map(p => <option key={p.codigoPais} value={p.codigoPais}>{p.nombrePais}</option>)}
            </select>
          </label>
          {paises.isError && <Button type="button" variant="outline" onClick={() => void paises.refetch()}>Reintentar países</Button>}
        </div>}
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => void localizar()}
          disabled={!numero.trim() || (tipo === 'PAS' && !pais)}>
          {busqueda.isPending ? 'Buscando…' : 'Buscar tutor'}
        </Button>
        {datos.idClienteRelacionado !== null && <p role="status">Tutor seleccionado · documento terminado en {datos.documento}</p>}
        {aviso && <p role="alert">{aviso}</p>}
        <div className="flex flex-wrap gap-3">
          <div className="min-w-0 flex-1 basis-60">
            <FechaInput id="fecha-tutor-alta" label="Fecha efectiva del respaldo del tutor" value={datos.fechaEfectiva}
              onChange={fechaEfectiva => cambiar(actual => ({ ...actual, fechaEfectiva }))} onBlur={() => {}} required />
          </div>
          <Button type="button" variant="outline" onClick={() => cambiar(actual => ({ ...actual, fechaEfectiva: fechaActual }))}>Usar fecha de hoy</Button>
        </div>
        <label>Tipo de respaldo del tutor<Input value={datos.tipoRespaldo} maxLength={80}
          onChange={e => {
            const tipoRespaldo = e.target.value
            cambiar(actual => ({ ...actual, tipoRespaldo }))
          }} /></label>
        <label>Referencia o descripción del respaldo del tutor<Input value={datos.referenciaRespaldo} maxLength={250}
          onChange={e => {
            const referenciaRespaldo = e.target.value
            cambiar(actual => ({ ...actual, referenciaRespaldo }))
          }} /></label>
      </fieldset>
    </FormSection>
  )
}
