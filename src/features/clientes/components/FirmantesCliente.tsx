import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Button, FechaInput, Input } from '@/shared/ui'
import { useBuscarClientes } from '@/features/clientes/hooks/useConsultaClientes'
import { formatearFecha, nombreVisible } from '@/features/clientes/lib/consulta'
import { agregarFirmante, finalizarFirmante, listarFirmantes, type Firmante } from '@/features/clientes/api/firmantes'
import { DialogoFicha } from '@/features/clientes/components/DialogoFicha'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'

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
  const campo = useId()
  useEffect(() => {
    const timer = setTimeout(() => setNombre(texto.trim()), 300)
    return () => clearTimeout(timer)
  }, [texto])
  const consulta = useBuscarClientes(nombre.length >= 3 ? { nombre, tipoCliente: 'Natural', estado: 'Activo' } : null)
  const mostrar = nombre.length >= 3 && texto.trim() === nombre && !consulta.isPlaceholderData
  const personas = consulta.data?.items.filter(p => p.idCliente !== titular) ?? []
  return <div className="grid gap-4">
    <Field id={campo} label="Buscar persona por nombre">
      <Input id={campo} className={fieldClassName} value={texto} maxLength={100}
        onChange={e => { setTexto(e.target.value); elegir(null) }} placeholder="Al menos tres caracteres" />
    </Field>
    {mostrar && consulta.isPending && <p role="status">Buscando personas…</p>}
    {mostrar && consulta.isError && <p role="alert">No se pudo buscar. <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></p>}
    {mostrar && consulta.isSuccess && (personas.length ? <Field id={`${campo}-resultado`} label={etiqueta}>
      <select id={`${campo}-resultado`} defaultValue="" key={nombre} className={`${fieldClassName} w-full border dark:scheme-dark`} onChange={e => {
        const persona = personas.find(p => p.idCliente === Number(e.target.value))
        elegir(persona ? { id: persona.idCliente, nombre: nombreVisible(persona) } : null)
      }}>
        <option value="" disabled hidden>Selecciona una persona</option>
        {personas.map(p => <option key={p.idCliente} value={p.idCliente}>{nombreVisible(p)} · {p.identificacion}</option>)}
      </select></Field> : <p>Sin coincidencias.</p>)}
  </div>
}

function Formulario({ id, edicion, disparador, cerrar, guardado }: {
  id: number; edicion: Edicion; disparador: RefObject<HTMLButtonElement | null>; cerrar: () => void; guardado: () => void
}) {
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
  return <DialogoFicha titulo={alta ? 'Agregar firmante' : `Finalizar vínculo de ${edicion.nombre}`}
    descripcion={alta ? 'Selecciona a la persona e indica qué puede firmar.' : edicion.alcance ?? 'Alcance sin registrar'}
    disparador={disparador} cerrar={cerrar} ocupado={mutacion.isPending}>
    <form onSubmit={e => { e.preventDefault(); if (listo && !mutacion.isPending) mutacion.mutate() }}>
      <fieldset disabled={mutacion.isPending} className="grid min-w-0 gap-5">
        {alta && <>
          <SelectorPersona titular={id} elegir={elegir} />
          <Field id="firmante-alcance" label="¿Qué puede firmar?">
            <Input id="firmante-alcance" className={fieldClassName} value={alcance} maxLength={250} onChange={e => setAlcance(e.target.value)} />
          </Field>
        </>}
        <FechaInput id="fecha-firma" label={alta ? 'Puede firmar desde' : 'Deja de firmar desde'} value={fecha}
          onChange={setFecha} onBlur={() => {}} inputClassName={fieldClassName} required
          accion={alta && <Button type="button" variant="outline" size="form" className="w-full sm:w-auto"
            onClick={() => setFecha(fechaEcuador.format(new Date()))}>Usar fecha de hoy</Button>} />
        <Field id="firmante-respaldo" label={alta ? 'Documento que autoriza la firma' : 'Documento que respalda el fin'}>
          <Input id="firmante-respaldo" className={fieldClassName} value={respaldo} maxLength={250}
            placeholder="Referencia o descripción del documento" onChange={e => setRespaldo(e.target.value)} />
        </Field>
        {listo && <p>{alta ? persona?.nombre : edicion.nombre} {alta ? 'podrá firmar' : 'dejará de firmar'} desde el {formatearFecha(fecha)}.</p>}
        {mutacion.isError && <p role="alert">{mutacion.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button><Button type="submit" disabled={!listo || mutacion.isPending}>{alta ? 'Confirmar vínculo' : 'Confirmar fin'}</Button></div>
      </fieldset>
    </form>
  </DialogoFicha>
}

export function FirmantesCliente({ id, editable }: { id: number; editable: boolean }) {
  const cache = useQueryClient()
  const key = ['clientes', id, 'firmantes']
  const consulta = useQuery({ queryKey: key, queryFn: ({ signal }) => listarFirmantes(id, signal) })
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const disparador = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const abrir = (valor: Edicion, boton: HTMLButtonElement) => {
    disparador.current = boton
    setAviso('')
    setEdicion(valor)
  }
  return <div className="grid gap-3">
    {consulta.isPending ? <p role="status">Cargando firmantes…</p> : consulta.isError ? <p role="alert">No pudimos consultar los firmantes. <Button variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></p> : <>
      <h3 className="font-semibold">Historial de firmantes</h3>
      {consulta.data.length === 0 && <p>No hay firmantes registrados.</p>}
      {consulta.data.map(f => <article key={f.idRelacion} className="grid gap-1 rounded-xl border border-border p-4">
        <strong>{f.nombre} · {f.fechaFin ? 'Finalizado' : 'Vigente'}</strong>
        <p>{f.alcance ?? 'Alcance sin registrar'}</p><p>Desde el {formatearFecha(f.fechaInicio)} · Respaldo: {f.respaldoAlta ?? 'Sin referencia registrada'}</p>
        {f.fechaFin && <p>Dejó de firmar el {formatearFecha(f.fechaFin)} · {f.respaldoFin ?? 'Sin referencia registrada'}</p>}
        {editable && !f.fechaFin && <Button className="justify-self-start" variant="outline" onClick={e => abrir(f, e.currentTarget)}>Finalizar vínculo</Button>}
      </article>)}
      {editable && <Button className="justify-self-start" onClick={e => abrir('alta', e.currentTarget)}>Agregar firmante</Button>}
    </>}
    {aviso && <p role="status">{aviso}</p>}
    {editable && edicion && <Formulario id={id} edicion={edicion} disparador={disparador} cerrar={() => setEdicion(null)} guardado={() => {
      setAviso(edicion === 'alta' ? 'Firmante agregado.' : 'Vínculo finalizado.')
      setEdicion(null)
      void cache.invalidateQueries({ queryKey: key })
    }} />}
  </div>
}
