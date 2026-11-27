import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Button, FechaInput, Input } from '@/shared/ui'
import { consultarTutor, guardarTutor, type AltaTutor, type Tutor } from '@/features/clientes/api/tutores'
import { SelectorPersona, type PersonaRelacionada } from '@/features/clientes/components/FirmantesCliente'
import { formatearFecha } from '@/features/clientes/lib/consulta'

const fechaEcuador = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil' })
const registroEcuador = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil', dateStyle: 'short', timeStyle: 'short',
})

function registro(valor: string, actor: number | null) {
  // SQL guarda UTC y devuelve timestamps sin zona en algunos entornos.
  const utc = /(?:Z|[+-]\d\d:\d\d)$/.test(valor) ? valor : `${valor}Z`
  const fecha = registroEcuador.format(new Date(utc))
  return actor === null ? fecha : `${fecha} · Usuario ${actor}`
}

function FormularioTutor({ id, titular, vigente, cancelar, guardado }: {
  id: number
  titular: string
  vigente?: Tutor
  cancelar: () => void
  guardado: () => void
}) {
  const [persona, elegir] = useState<PersonaRelacionada | null>(null)
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [confirmacion, setConfirmacion] = useState<AltaTutor | null>(null)
  const mutacion = useMutation({
    mutationFn: (datos: AltaTutor) => guardarTutor(id, datos, vigente?.idRelacion ?? null),
    onSuccess: guardado,
    retry: false,
  })
  const fechaHoy = fechaEcuador.format(new Date())
  const futura = fecha > fechaHoy
  const valida = z.iso.date().safeParse(fecha).success && !futura
  return (
    <form className="grid max-w-xl gap-4 rounded-xl border border-border p-4" onSubmit={e => {
      e.preventDefault()
      if (confirmacion) {
        if (!mutacion.isPending) mutacion.mutate(confirmacion)
      } else if (persona && valida && tipo.trim() && referencia.trim()) {
        setConfirmacion({
          idClienteRelacionado: persona.id,
          fechaEfectiva: fecha,
          tipoRespaldo: tipo.trim(),
          referenciaRespaldo: referencia.trim(),
        })
      }
    }}>
      <fieldset disabled={mutacion.isPending} className="grid gap-4">
        <legend className="mb-3 font-semibold">{vigente ? 'Cambiar tutor' : 'Registrar tutor'}</legend>
        {confirmacion && persona ? (
          <dl className="grid gap-2 rounded-lg bg-muted p-4">
            <div><dt className="font-medium">Cliente</dt><dd>{titular}</dd></div>
            {vigente && <div><dt className="font-medium">Tutor anterior</dt><dd>{vigente.nombre}</dd></div>}
            <div><dt className="font-medium">Tutor nuevo</dt><dd>{persona.nombre}</dd></div>
            <div><dt className="font-medium">Representa desde</dt><dd>{formatearFecha(confirmacion.fechaEfectiva)}</dd></div>
            <div><dt className="font-medium">Respaldo</dt><dd>{confirmacion.tipoRespaldo} · {confirmacion.referenciaRespaldo}</dd></div>
          </dl>
        ) : (
          <>
            <SelectorPersona titular={id} elegir={elegir} etiqueta="Tutor" />
            {persona && <p>Tutor seleccionado: {persona.nombre}</p>}
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1 basis-60">
                <FechaInput id="tutor-fecha" label="Fecha efectiva del documento" value={fecha}
                  onChange={setFecha} onBlur={() => {}} required />
              </div>
              <Button type="button" variant="outline" onClick={() => setFecha(fechaHoy)}>Usar fecha de hoy</Button>
            </div>
            {futura && <p role="alert">Podrás registrar el cambio a partir del {formatearFecha(fecha)}.</p>}
            <label>Tipo de documento<Input required value={tipo} maxLength={80}
              onChange={e => setTipo(e.target.value)} placeholder="Ej. resolución judicial" /></label>
            <label>Referencia o descripción del documento<Input required value={referencia} maxLength={250}
              onChange={e => setReferencia(e.target.value)} placeholder="Número o descripción si no tiene número" /></label>
          </>
        )}
        {mutacion.isError && <p role="alert">{mutacion.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={mutacion.isPending || (!confirmacion && (!persona || !valida || !tipo.trim() || !referencia.trim()))}>
            {confirmacion ? 'Confirmar guardado' : 'Revisar cambio'}
          </Button>
          {confirmacion && <Button type="button" variant="outline" onClick={() => { mutacion.reset(); setConfirmacion(null) }}>
            Editar datos
          </Button>}
          <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>
        </div>
      </fieldset>
    </form>
  )
}

export function TutorCliente({ id, titular, editable }: { id: number; titular: string; editable: boolean }) {
  const cache = useQueryClient()
  const key = ['clientes', id, 'tutor']
  const consulta = useQuery({ queryKey: key, queryFn: ({ signal }) => consultarTutor(id, signal) })
  const [edicion, setEdicion] = useState<Tutor | 'alta' | null>(null)
  const [aviso, setAviso] = useState('')
  const datos = consulta.data
  const vigente = datos?.historial.find(item => item.idRelacion === datos.idVigente)

  if (consulta.isPending) return <p role="status">Consultando tutor…</p>
  if (consulta.isError) return (
    <p role="alert">No pudimos consultar el tutor. <Button variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></p>
  )
  if (!datos || (!datos.admiteTutor && !datos.historial.length)) return null

  return (
    <section aria-labelledby="tutor-titulo" className="mb-5 grid gap-3">
      <h3 id="tutor-titulo" className="font-semibold">Tutor e historial</h3>
      {!datos.historial.length && <p>No hay un tutor registrado.</p>}
      {datos.historial.map(item => (
        <article key={item.idRelacion} className="grid gap-1 rounded-xl border border-border p-4">
          <strong>{item.nombre} · {item.idRelacion === datos.idVigente ? 'Vigente' : item.fechaFin ? 'Finalizado' : 'Programado'}</strong>
          <p>Vigencia desde el {formatearFecha(item.fechaInicio)}{item.fechaFin && ` hasta el ${formatearFecha(item.fechaFin)} inclusive`}</p>
          <p>Respaldo de alta: {[item.tipoRespaldoAlta, item.respaldoAlta].filter(Boolean).join(' · ') || 'Sin referencia registrada'}</p>
          <p>Alta registrada: {registro(item.fechaCreacion, item.creadoPor)}</p>
          {item.respaldoFin && <p>Respaldo de relevo: {[item.tipoRespaldoFin, item.respaldoFin].filter(Boolean).join(' · ')}</p>}
          {item.finalizadoEn && <p>Relevo registrado: {registro(item.finalizadoEn, item.finalizadoPor)}</p>}
        </article>
      ))}
      {aviso && <p role="status">{aviso}</p>}
      {editable && datos.admiteTutor && !edicion && (
        <Button className="justify-self-start" disabled={consulta.isFetching}
          onClick={() => { setAviso(''); setEdicion(vigente ?? 'alta') }}>
          {vigente ? 'Cambiar tutor' : 'Registrar tutor'}
        </Button>
      )}
      {editable && datos.admiteTutor && edicion && (
        <FormularioTutor id={id} titular={titular} vigente={edicion === 'alta' ? undefined : edicion}
          cancelar={() => setEdicion(null)} guardado={() => {
          setAviso(edicion === 'alta' ? 'Tutor registrado.' : 'Relevo guardado.')
          setEdicion(null)
          void cache.invalidateQueries({ queryKey: key })
        }} />
      )}
    </section>
  )
}
