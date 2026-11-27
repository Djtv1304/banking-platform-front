import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Upload } from 'lucide-react'

import {
  consultarClasesArchivo, leerArchivo, listarArchivos, subirArchivo, type ArchivoCliente,
} from '@/features/clientes/api/archivos'
import { ApiError } from '@/shared/api'
import { habilitacionKey } from '@/features/clientes/api/habilitacion'
import { clienteDetalleKey } from '@/features/clientes/hooks/useConsultaClientes'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label,
} from '@/shared/ui'

const TIPOS = ['application/pdf', 'image/jpeg', 'image/png']
const fecha = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' })

function mensaje(error: unknown) {
  if (!(error instanceof ApiError)) return 'Ocurrió un error con los archivos. Inténtalo nuevamente.'
  if (error.status === 503 && error.code === 'http_503') return 'No se pudo abrir el archivo en este momento. Inténtalo más tarde.'
  if (error.status === 409 && error.code === 'http_409') return 'El archivo no está disponible para consulta.'
  if (error.status === 403 && error.code === 'http_403') return 'No tienes permiso para abrir este archivo.'
  return error.message
}

export function ArchivosCliente({ idCliente, puedeVer, puedeSubir }: {
  idCliente: number
  puedeVer: boolean
  puedeSubir: boolean
}) {
  const listadoKey = ['clientes', idCliente, 'archivos'] as const
  const queryClient = useQueryClient()
  const listado = useQuery({
    queryKey: listadoKey, queryFn: ({ signal }) => listarArchivos(idCliente, signal),
    enabled: puedeVer, retry: false, gcTime: 0,
  })
  const clases = useQuery({
    queryKey: [...listadoKey, 'clases'], queryFn: ({ signal }) => consultarClasesArchivo(idCliente, signal),
    enabled: puedeSubir && !puedeVer, retry: false, gcTime: 0,
  })
  const consulta = puedeVer ? listado : clases

  const input = useRef<HTMLInputElement>(null)
  const peticion = useRef<AbortController | null>(null)
  const [seleccion, setSeleccion] = useState<File>()
  const [clase, setClase] = useState('')
  const [anterior, setAnterior] = useState<ArchivoCliente>()
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [leyendo, setLeyendo] = useState(false)
  const [vista, setVista] = useState<{ url: string; archivo: ArchivoCliente }>()
  const urlVista = vista?.url

  useEffect(() => () => peticion.current?.abort(), [])
  useEffect(() => () => {
    if (urlVista) URL.revokeObjectURL(urlVista)
  }, [urlVista])

  const carga = useMutation({
    mutationFn: (datos: { archivo: File; clase: string; previo?: number }) =>
      subirArchivo(idCliente, datos.archivo, datos.clase, datos.previo, setProgreso),
    onSuccess: async () => {
      setConfirmacion('El archivo quedó guardado.')
      setSeleccion(undefined)
      setAnterior(undefined)
      if (input.current) input.current.value = ''
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listadoKey }),
        queryClient.invalidateQueries({ queryKey: habilitacionKey(idCliente) }),
        queryClient.invalidateQueries({ queryKey: clienteDetalleKey(idCliente) }),
      ])
    },
    onError: (causa) => setError(mensaje(causa)),
    onSettled: () => setProgreso(0),
  })

  const verContenido = async (archivo: ArchivoCliente, descargar: boolean) => {
    if (peticion.current) return
    const abortar = new AbortController()
    peticion.current = abortar
    setLeyendo(true)
    setError('')
    try {
      const { blob, nombre } = await leerArchivo(idCliente, archivo, abortar.signal)
      if (abortar.signal.aborted) return
      const url = URL.createObjectURL(blob)
      if (descargar) {
        const enlace = document.createElement('a')
        enlace.href = url
        enlace.download = nombre
        document.body.append(enlace)
        try {
          enlace.click()
        } finally {
          enlace.remove()
          URL.revokeObjectURL(url)
        }
      } else {
        setVista({ url, archivo })
      }
    } catch (causa) {
      if (!abortar.signal.aborted) setError(mensaje(causa))
    } finally {
      peticion.current = null
      if (!abortar.signal.aborted) setLeyendo(false)
    }
  }

  const enviar = () => {
    setConfirmacion('')
    const maximo = consulta.data?.maxBytes
    if (!seleccion || !clase || !maximo) return
    if (seleccion.size === 0 || seleccion.size > maximo) {
      setError(`El archivo debe contener datos y pesar hasta ${maximo.toLocaleString('es-EC')} bytes.`)
      return
    }
    if (seleccion.type && !TIPOS.includes(seleccion.type)) {
      setError('Selecciona un archivo PDF, JPG o PNG.')
      return
    }
    setError('')
    carga.mutate({ archivo: seleccion, clase, previo: anterior?.idArchivo })
  }

  if (consulta.isPending) return <p role="status">Cargando archivos…</p>
  if (consulta.isError) return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="alert" className="text-destructive">{mensaje(consulta.error)}</p>
      <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button>
    </div>
  )

  const catalogo = consulta.data?.clases ?? []
  const archivos = puedeVer ? listado.data?.archivos ?? [] : []

  return (
    <div className="space-y-4">
      {puedeSubir && (
        <form className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          onSubmit={(evento) => { evento.preventDefault(); enviar() }}>
          {anterior && (
            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
              <p>Reemplazar {anterior.nombreOriginal} (versión {anterior.version})</p>
              <Button type="button" variant="ghost" disabled={carga.isPending}
                onClick={() => setAnterior(undefined)}>Cancelar reemplazo</Button>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="archivo-clase">Clase de documento</Label>
            <select id="archivo-clase" value={clase} required disabled={!!anterior || carga.isPending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(evento) => setClase(evento.currentTarget.value)}>
              <option value="">Selecciona una clase</option>
              {catalogo.map(({ codigo, nombre }) => <option key={codigo} value={codigo}>{nombre}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-archivo">Archivo PDF, JPG o PNG</Label>
            <Input id="cliente-archivo" type="file" ref={input} accept=".pdf,.jpg,.jpeg,.png" required
              disabled={carga.isPending} onChange={(evento) => setSeleccion(evento.currentTarget.files?.[0])} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={!seleccion || !clase || carga.isPending}>
              <Upload />{anterior ? 'Guardar nueva versión' : 'Subir archivo'}
            </Button>
            {carga.isPending && (
              <span role="status">{progreso < 100 ? `Enviando… ${progreso}%` : 'Revisando el archivo…'}</span>
            )}
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {confirmacion && <p role="status" className="text-sm">{confirmacion}</p>}
      {leyendo && puedeVer && <p role="status">Abriendo el archivo…</p>}

      {puedeVer && (archivos.length === 0 ? <p>Aún no hay archivos en esta ficha.</p> : (
        <ul aria-label="Archivos de la ficha" className="divide-y divide-border">
          {archivos.map((archivo) => (
            <li key={archivo.idArchivo} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-all font-medium">{archivo.nombreOriginal}</p>
                <p className="text-sm text-muted-foreground">
                  {catalogo.find((item) => item.codigo === archivo.claseDocumento)?.nombre ?? archivo.claseDocumento}
                  {' · '}{fecha.format(new Date(archivo.fechaSubida))}
                  {' · Versión '}{archivo.version}{archivo.reemplazado ? ' (anterior)' : ''}
                  {archivo.estadoAnalisis !== 'Limpio' ? ` · ${archivo.estadoAnalisis}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {archivo.estadoAnalisis === 'Limpio' && <>
                  <Button type="button" variant="outline" size="sm" disabled={leyendo}
                    onClick={() => void verContenido(archivo, false)}><Eye />Ver</Button>
                  <Button type="button" variant="outline" size="sm" disabled={leyendo}
                    onClick={() => void verContenido(archivo, true)}><Download />Descargar</Button>
                </>}
                {puedeSubir && !archivo.reemplazado && catalogo.some((item) => item.codigo === archivo.claseDocumento) && (
                  <Button type="button" variant="ghost" size="sm" disabled={carga.isPending}
                    onClick={() => { setAnterior(archivo); setClase(archivo.claseDocumento); input.current?.focus() }}>
                    Reemplazar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ))}
      {vista && puedeVer && (
        <Dialog open onOpenChange={(abierto) => { if (!abierto) setVista(undefined) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vista del archivo</DialogTitle>
              <DialogDescription className="break-all">{vista.archivo.nombreOriginal}</DialogDescription>
            </DialogHeader>
            {vista.archivo.tipoContenido === 'application/pdf' ? (
              <Button asChild variant="outline">
                <a href={vista.url} target="_blank" rel="noopener noreferrer">Abrir PDF en otra pestaña</a>
              </Button>
            ) : <img className="mx-auto max-h-[65vh] max-w-full" src={vista.url} alt={vista.archivo.nombreOriginal} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
