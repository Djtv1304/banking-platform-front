import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Aviso, AvisoRequiereAprobacion, Button, FechaInput, Input } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { usePaises } from '@/features/catalogos/hooks/useCatalogos'
import {
  agregarDocumento, cambiarDocumento, solicitarPrincipal,
  useDocumentosCliente, useTiposIdentidad, type DocumentoFicha,
} from '@/features/clientes/api/documentos-identidad'

type Accion = 'AGREGAR' | 'RENOVAR' | 'ANULAR' | 'MARCAR_ERROR' | 'PRINCIPAL' | 'CORREGIR'
const ESTADO: Record<string, string> = {
  VIGENTE: 'Vigente', VENCIDO: 'Vencido', ANULADO: 'Anulado',
  POR_COMPLETAR: 'Datos por completar', POR_CORREGIR: 'Identificación por corregir',
}
const TITULO: Record<Accion, string> = {
  AGREGAR: 'Agregar documento', RENOVAR: 'Renovar o completar datos', ANULAR: 'Anular registro',
  MARCAR_ERROR: 'Marcar identificación por corregir', PRINCIPAL: 'Solicitar como principal',
  CORREGIR: 'Solicitar corrección del principal',
}

export function DocumentosCliente({ idCliente, editar }: { idCliente: number; editar: boolean }) {
  const consulta = useDocumentosCliente(idCliente)
  const tipos = useTiposIdentidad()
  const paises = usePaises()
  const cache = useQueryClient()
  const [seleccion, setSeleccion] = useState<{ accion: Accion; documento?: DocumentoFicha }>()
  const [tipo, setTipo] = useState('')
  const [emision, setEmision] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [solicitud, setSolicitud] = useState<number>()

  const guardar = useMutation({
    mutationFn: async (formulario: FormData) => {
      if (!seleccion) return
      const { documento, accion } = seleccion
      const motivo = String(formulario.get('motivo') ?? '').trim()
      const codigoPaisEmision = formulario.get('emisor') || undefined
      const fechas = { fechaEmision: emision || null, fechaVencimiento: vencimiento || null }
      if (accion === 'AGREGAR') {
        await agregarDocumento(idCliente, {
          tipoDocumento: tipo, numero: formulario.get('numero'), codigoPaisEmision, motivo, ...fechas,
        })
      } else if (documento && (accion === 'PRINCIPAL' || accion === 'CORREGIR')) {
        const respuesta = await solicitarPrincipal(idCliente, documento.idDocumento, {
          version: documento.version, motivo, anularAnterior: accion === 'CORREGIR',
        })
        setSolicitud(respuesta.idSolicitud)
      } else if (documento) {
        await cambiarDocumento(idCliente, documento.idDocumento, {
          version: documento.version, motivo, accion,
          ...(accion === 'RENOVAR' ? { ...fechas, codigoPaisEmision } : {}),
        })
      }
    },
    onSuccess: async () => {
      setSeleccion(undefined)
      await cache.invalidateQueries({ queryKey: ['clientes', idCliente, 'documentos'] })
    },
  })

  const elegir = (accion: Accion, documento?: DocumentoFicha) => {
    guardar.reset()
    setSolicitud(undefined)
    setTipo(documento?.tipoDocumento ?? '')
    setEmision(documento?.fechaEmision ?? '')
    setVencimiento(documento?.fechaVencimiento ?? '')
    setSeleccion({ accion, documento })
  }
  const regla = tipos.data?.find((item) => item.codigo === tipo)
  const fechas = seleccion?.accion === 'AGREGAR' || seleccion?.accion === 'RENOVAR'
  const registrar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    guardar.mutate(new FormData(evento.currentTarget))
  }

  if (consulta.isPending) return <p role="status">Cargando documentos…</p>
  if (consulta.isError) return <Aviso tono="error"><Button variant="outline" onClick={() => void consulta.refetch()}>Reintentar documentos</Button></Aviso>

  return (
    <div className="flex flex-col gap-4">
      {editar && <Button type="button" variant="outline" onClick={() => elegir('AGREGAR')}>Agregar documento</Button>}
      {solicitud !== undefined && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
      {consulta.data.length === 0 && <p>Esta ficha todavía no tiene documentos.</p>}
      {consulta.data.map((documento) => (
        <article key={documento.idDocumento} className="rounded-xl border border-border p-4">
          <p className="font-semibold">{documento.nombreTipo} {documento.numero}{documento.principal && ' · Principal'}</p>
          <p>{ESTADO[documento.estado] ?? documento.estado}{documento.tipoActivo ? '' : ' · Tipo inactivo'}</p>
          {documento.codigoPaisEmision && <p>País emisor: {documento.codigoPaisEmision}</p>}
          {documento.fechaVencimiento && <p>Vence el {documento.fechaVencimiento}</p>}
          {editar && documento.estado !== 'ANULADO' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {documento.estado !== 'POR_CORREGIR' && (
                <>
                  <Button type="button" variant="outline" onClick={() => elegir('RENOVAR', documento)}>Renovar o completar</Button>
                  <Button type="button" variant="outline" onClick={() => elegir('MARCAR_ERROR', documento)}>Marcar error</Button>
                </>
              )}
              {!documento.principal && <Button type="button" variant="outline" onClick={() => elegir('ANULAR', documento)}>Anular</Button>}
              {!documento.principal && documento.tipoActivo && documento.permitePrincipal && documento.estado === 'VIGENTE' && (
                <>
                  <Button type="button" variant="outline" onClick={() => elegir('PRINCIPAL', documento)}>Solicitar como principal</Button>
                  <Button type="button" variant="outline" onClick={() => elegir('CORREGIR', documento)}>Reemplazar y anular principal erróneo</Button>
                </>
              )}
            </div>
          )}
        </article>
      ))}
      {seleccion && (
        <form className="flex flex-col gap-3 rounded-xl border border-border p-4" onSubmit={registrar}>
          <h3 className="font-semibold">{TITULO[seleccion.accion]}</h3>
          <fieldset disabled={guardar.isPending} className="flex flex-col gap-3">
            {seleccion.accion === 'AGREGAR' && (
              <>
                <label>Tipo de documento
                  <select required className="ml-2 rounded border" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="">Selecciona el tipo</option>
                    {tipos.data?.filter((item) => item.activo).map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
                  </select>
                </label>
                <label>Número de documento<Input name="numero" required maxLength={regla?.longitudMaxima ?? 20} autoComplete="off" /></label>
              </>
            )}
            {fechas && regla?.requierePais && !seleccion.documento?.codigoPaisEmision && (
              <label>País emisor
                <select name="emisor" required className="ml-2 rounded border" defaultValue="">
                  <option value="">Selecciona el país</option>
                  {paises.data.map((pais) => <option key={pais.codigoPais} value={pais.codigoPais}>{pais.nombrePais}</option>)}
                </select>
              </label>
            )}
            {fechas && (
              <>
                <FechaInput id="gestion-documento-emision" label="Fecha de emisión" value={emision} onChange={setEmision} onBlur={() => undefined} />
                <FechaInput id="gestion-documento-vencimiento" label="Fecha de vencimiento" value={vencimiento} onChange={setVencimiento} onBlur={() => undefined} />
              </>
            )}
            <label>Motivo<Input name="motivo" required maxLength={300} /></label>
            {guardar.isError && <Aviso tono="error">{toApiError(guardar.error).message}</Aviso>}
            <div className="flex gap-2">
              <Button type="submit">{guardar.isPending ? 'Guardando…' : 'Confirmar'}</Button>
              <Button type="button" variant="outline" onClick={() => setSeleccion(undefined)}>Cancelar</Button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  )
}
