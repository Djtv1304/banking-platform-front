import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Aviso, AvisoRequiereAprobacion, Badge, Button, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, FechaInput, Input,
} from '@/shared/ui'
import { toApiError } from '@/shared/api'
import { usePaises } from '@/features/catalogos/hooks/useCatalogos'
import {
  agregarDocumento, cambiarDocumento, solicitarPrincipal,
  useDocumentosCliente, useTiposIdentidad, type DocumentoFicha,
} from '@/features/clientes/api/documentos-identidad'
import { Field, SelectField, fieldClassName } from '@/features/clientes/components/form-fields'
import { formatearFecha } from '@/features/clientes/lib/consulta'

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
  const [emisor, setEmisor] = useState('')
  const [emision, setEmision] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [solicitud, setSolicitud] = useState<number>()
  const disparador = useRef<HTMLButtonElement>(null)

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

  const elegir = (accion: Accion, boton: HTMLButtonElement, documento?: DocumentoFicha) => {
    disparador.current = boton
    guardar.reset()
    setSolicitud(undefined)
    setTipo(documento?.tipoDocumento ?? '')
    setEmisor('')
    setEmision(documento?.fechaEmision ?? '')
    setVencimiento(documento?.fechaVencimiento ?? '')
    setSeleccion({ accion, documento })
  }
  const regla = tipos.data?.find((item) => item.codigo === tipo)
  const fechas = seleccion?.accion === 'AGREGAR' || seleccion?.accion === 'RENOVAR'
  const requiereEmisor = fechas && regla?.requierePais && !seleccion.documento?.codigoPaisEmision
  const registrar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (editar && !guardar.isPending) guardar.mutate(new FormData(evento.currentTarget))
  }

  if (consulta.isPending) return <p role="status">Cargando documentos…</p>
  if (consulta.isError) return <Aviso tono="error"><Button variant="outline" onClick={() => void consulta.refetch()}>Reintentar documentos</Button></Aviso>

  return (
    <div className="flex flex-col gap-4">
      {editar && (
        <Button type="button" className="self-start" onClick={evento => elegir('AGREGAR', evento.currentTarget)}>
          Agregar documento
        </Button>
      )}
      {solicitud !== undefined && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
      {consulta.data.length === 0 && <p>Esta ficha todavía no tiene documentos.</p>}
      {consulta.data.map((documento) => (
        <article key={documento.idDocumento} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-heading">{documento.nombreTipo}</h3>
              <p className="mt-1 break-all text-sm text-muted-foreground">{documento.numero}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {documento.principal && <Badge variant="default">Principal</Badge>}
              <Badge variant="outline">{ESTADO[documento.estado] ?? documento.estado}</Badge>
              {!documento.tipoActivo && <Badge variant="secondary">Tipo inactivo</Badge>}
            </div>
          </div>
          {(documento.codigoPaisEmision || documento.fechaVencimiento) && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {documento.codigoPaisEmision && (
                <div className="space-y-1"><dt className="text-muted-foreground">País emisor</dt><dd>{documento.codigoPaisEmision}</dd></div>
              )}
              {documento.fechaVencimiento && (
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Vencimiento</dt>
                  <dd><time dateTime={documento.fechaVencimiento}>{formatearFecha(documento.fechaVencimiento)}</time></dd>
                </div>
              )}
            </dl>
          )}
          {editar && documento.estado !== 'ANULADO' && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {documento.estado !== 'POR_CORREGIR' && (
                <>
                  <Button type="button" variant="outline" onClick={evento => elegir('RENOVAR', evento.currentTarget, documento)}>Renovar o completar</Button>
                  <Button type="button" variant="outline" onClick={evento => elegir('MARCAR_ERROR', evento.currentTarget, documento)}>Marcar error</Button>
                </>
              )}
              {!documento.principal && <Button type="button" variant="outline" onClick={evento => elegir('ANULAR', evento.currentTarget, documento)}>Anular</Button>}
              {!documento.principal && documento.tipoActivo && documento.permitePrincipal && documento.estado === 'VIGENTE' && (
                <>
                  <Button type="button" variant="outline" onClick={evento => elegir('PRINCIPAL', evento.currentTarget, documento)}>Solicitar como principal</Button>
                  <Button type="button" variant="outline" className="h-auto min-h-9 whitespace-normal"
                    onClick={evento => elegir('CORREGIR', evento.currentTarget, documento)}>Reemplazar y anular principal erróneo</Button>
                </>
              )}
            </div>
          )}
        </article>
      ))}
      {editar && seleccion && (
        <Dialog open onOpenChange={abierto => { if (!abierto && !guardar.isPending) setSeleccion(undefined) }}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 md:max-w-2xl sm:p-6"
            showCloseButton={!guardar.isPending}
            onInteractOutside={evento => evento.preventDefault()}
            onCloseAutoFocus={evento => {
              evento.preventDefault()
              disparador.current?.focus()
            }}>
            <DialogHeader className="pr-8">
              <DialogTitle>{TITULO[seleccion.accion]}</DialogTitle>
              <DialogDescription>
                {seleccion.documento
                  ? `${seleccion.documento.nombreTipo} · ${seleccion.documento.numero}`
                  : 'Selecciona el tipo de documento e ingresa sus datos.'}
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-5" onSubmit={registrar}>
              <fieldset disabled={guardar.isPending} className="grid min-w-0 gap-5 sm:grid-cols-2">
                {seleccion.accion === 'AGREGAR' && (
                  <>
                    <Field id="gestion-documento-tipo" label="Tipo de documento">
                      <SelectField id="gestion-documento-tipo" value={tipo} onChange={nuevo => { setTipo(nuevo); setEmisor('') }}
                        options={(tipos.data ?? []).filter(item => item.activo).map(item => ({ value: item.codigo, label: item.nombre }))}
                        placeholder="Selecciona el tipo" required disabled={guardar.isPending || tipos.isPending} />
                      {tipos.isError && (
                        <button type="button" className="self-start text-link underline" onClick={() => void tipos.refetch()}>
                          Reintentar tipos de documento
                        </button>
                      )}
                    </Field>
                    <Field id="gestion-documento-numero" label="Número de documento">
                      <Input id="gestion-documento-numero" name="numero" required className={fieldClassName}
                        maxLength={regla?.longitudMaxima ?? 20} autoComplete="off" />
                    </Field>
                  </>
                )}
                {requiereEmisor && (
                  <Field id="gestion-documento-emisor" label="País emisor" className="sm:col-span-2">
                    <SelectField id="gestion-documento-emisor" name="emisor" value={emisor} onChange={setEmisor}
                      options={paises.data.map(pais => ({ value: pais.codigoPais, label: pais.nombrePais }))}
                      placeholder="Selecciona el país" required disabled={guardar.isPending || paises.isPending} />
                    {paises.isError && (
                      <button type="button" className="self-start text-link underline" onClick={() => void paises.refetch()}>
                        Reintentar países
                      </button>
                    )}
                  </Field>
                )}
                {fechas && (
                  <div className="grid min-w-0 gap-5 sm:col-span-2">
                    <FechaInput id="gestion-documento-emision" label="Fecha de emisión" value={emision}
                      inputClassName={fieldClassName} onChange={setEmision} onBlur={() => undefined} />
                    <FechaInput id="gestion-documento-vencimiento" label="Fecha de vencimiento" value={vencimiento}
                      inputClassName={fieldClassName} onChange={setVencimiento} onBlur={() => undefined} />
                  </div>
                )}
                <Field id="gestion-documento-motivo" label="Motivo" className="sm:col-span-2">
                  <Input id="gestion-documento-motivo" name="motivo" required maxLength={300} className={fieldClassName} />
                </Field>
              </fieldset>
              {guardar.isError && <Aviso tono="error">{toApiError(guardar.error).message}</Aviso>}
              <DialogFooter className="mx-0 mb-0 rounded-none border-border bg-transparent px-0 pb-0">
                <Button type="button" variant="outline" disabled={guardar.isPending} onClick={() => setSeleccion(undefined)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardar.isPending || (seleccion.accion === 'AGREGAR' && !tipo) || (requiereEmisor && !emisor)}>
                  {guardar.isPending ? 'Guardando…' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
