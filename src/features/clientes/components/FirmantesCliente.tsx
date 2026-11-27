import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Button, FechaInput, Input } from '@/shared/ui'
import { useBuscarClientes } from '@/features/clientes/hooks/useConsultaClientes'
import { formatearFecha, nombreVisible } from '@/features/clientes/lib/consulta'
import { agregarFirmante, finalizarFirmante, listarFirmantes, type Firmante } from '@/features/clientes/api/firmantes'

type Edicion = 'alta' | Firmante
export type PersonaRelacionada = { id: number; nombre: string }

const fechaEcuador = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil' })

export function SelectorPersona({ titular, elegir, etiqueta = 'Persona firmante' }: {
  titular: number
  elegir: (persona: PersonaRelacionada | null) => void
  etiqueta?: string
}) {
  const [texto, setTexto] = useState('')
  const [nombre, setNombre] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setNombre(texto.trim()), 300)
    return () => clearTimeout(timer)
  }, [texto])
  const consulta = useBuscarClientes(nombre.length >= 3 ? { nombre, tipoCliente: 'Natural', estado: 'Activo' } : null)
  const mostrar = nombre.length >= 3 && texto.trim() === nombre && !consulta.isPlaceholderData
  const personas = consulta.data?.items.filter(p => p.idCliente !== titular) ?? []
  return <div className="grid gap-2">
    <label>Buscar persona por nombre<Input value={texto} maxLength={100} onChange={e => { setTexto(e.target.value); elegir(null) }} placeholder="Al menos tres caracteres" /></label>
    {mostrar && consulta.isPending && <p role="status">Buscando personas…</p>}
    {mostrar && consulta.isError && <p role="alert">No se pudo buscar. <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></p>}
    {mostrar && consulta.isSuccess && (personas.length ? <label>{etiqueta}
      <select defaultValue="" key={nombre} className="block w-full rounded-lg border border-border bg-field p-2" onChange={e => {
        const persona = personas.find(p => p.idCliente === Number(e.target.value))
        elegir(persona ? { id: persona.idCliente, nombre: nombreVisible(persona) } : null)
      }}>
        <option value="">Selecciona una persona</option>
        {personas.map(p => <option key={p.idCliente} value={p.idCliente}>{nombreVisible(p)} · {p.identificacion}</option>)}
      </select></label> : <p>Sin coincidencias.</p>)}
  </div>
}

function Formulario({ id, edicion, cerrar, guardado }: { id: number; edicion: Edicion; cerrar: () => void; guardado: () => void }) {
  const [persona, elegir] = useState<PersonaRelacionada | null>(null)
  const [alcance, setAlcance] = useState('')
  const [fecha, setFecha] = useState('')
  const [respaldo, setRespaldo] = useState('')
  const alta = edicion === 'alta'
  const mutacion = useMutation({
    mutationFn: async () => {
      if (edicion !== 'alta') return finalizarFirmante(id, edicion.idRelacion, fecha, respaldo.trim())
      if (!persona) throw new Error('Selecciona una persona.')
      await agregarFirmante(id, { idClienteRelacionado: persona.id, alcance: alcance.trim(), fechaInicio: fecha, respaldo: respaldo.trim() })
    }, onSuccess: guardado, retry: false,
  })
  const listo = (!alta || (persona && alcance.trim())) && respaldo.trim() && z.iso.date().safeParse(fecha).success
  return <form className="grid max-w-xl gap-4 rounded-xl border border-border p-4" onSubmit={e => { e.preventDefault(); if (listo && !mutacion.isPending) mutacion.mutate() }}>
    <fieldset disabled={mutacion.isPending} className="grid gap-4">
      <legend className="mb-3 font-semibold">{alta ? 'Agregar firmante' : `Finalizar vínculo de ${edicion.nombre}`}</legend>
      {alta ? <><SelectorPersona titular={id} elegir={elegir} /><label>¿Qué puede firmar?<Input value={alcance} maxLength={250} onChange={e => setAlcance(e.target.value)} /></label></> : <p>{edicion.alcance ?? 'Alcance sin registrar'}</p>}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <FechaInput id="fecha-firma" label={alta ? 'Puede firmar desde' : 'Deja de firmar desde'} value={fecha} onChange={setFecha} onBlur={() => {}} required />
        </div>
        {alta && (
          <Button type="button" variant="outline" onClick={() => setFecha(fechaEcuador.format(new Date()))}>
            Usar fecha de hoy
          </Button>
        )}
      </div>
      <label>{alta ? 'Documento que autoriza la firma' : 'Documento que respalda el fin'}<Input value={respaldo} maxLength={250} placeholder="Referencia o descripción del documento" onChange={e => setRespaldo(e.target.value)} /></label>
      {listo && <p>{alta ? persona?.nombre : edicion.nombre} {alta ? 'podrá firmar' : 'dejará de firmar'} desde el {formatearFecha(fecha)}.</p>}
      {mutacion.isError && <p role="alert">{mutacion.error.message}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!listo || mutacion.isPending}>{alta ? 'Confirmar vínculo' : 'Confirmar fin'}</Button><Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button></div>
    </fieldset>
  </form>
}

export function FirmantesCliente({ id, editable }: { id: number; editable: boolean }) {
  const cache = useQueryClient()
  const key = ['clientes', id, 'firmantes']
  const consulta = useQuery({ queryKey: key, queryFn: ({ signal }) => listarFirmantes(id, signal) })
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [aviso, setAviso] = useState('')
  return <div className="grid gap-3">
    {consulta.isPending ? <p role="status">Cargando firmantes…</p> : consulta.isError ? <p role="alert">No pudimos consultar los firmantes. <Button variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></p> : <>
      <h3 className="font-semibold">Historial de firmantes</h3>
      {consulta.data.length === 0 && <p>No hay firmantes registrados.</p>}
      {consulta.data.map(f => <article key={f.idRelacion} className="grid gap-1 rounded-xl border border-border p-4">
        <strong>{f.nombre} · {f.fechaFin ? 'Finalizado' : 'Vigente'}</strong>
        <p>{f.alcance ?? 'Alcance sin registrar'}</p><p>Desde el {formatearFecha(f.fechaInicio)} · Respaldo: {f.respaldoAlta ?? 'Sin referencia registrada'}</p>
        {f.fechaFin && <p>Dejó de firmar el {formatearFecha(f.fechaFin)} · {f.respaldoFin ?? 'Sin referencia registrada'}</p>}
        {editable && !edicion && !f.fechaFin && <Button className="justify-self-start" variant="outline" onClick={() => { setAviso(''); setEdicion(f) }}>Finalizar vínculo</Button>}
      </article>)}
      {editable && !edicion && <Button className="justify-self-start" onClick={() => { setAviso(''); setEdicion('alta') }}>Agregar firmante</Button>}
    </>}
    {aviso && <p role="status">{aviso}</p>}
    {editable && edicion && <Formulario id={id} edicion={edicion} cerrar={() => setEdicion(null)} guardado={() => {
      setAviso(edicion === 'alta' ? 'Firmante agregado.' : 'Vínculo finalizado.')
      setEdicion(null)
      void cache.invalidateQueries({ queryKey: key })
    }} />}
  </div>
}
