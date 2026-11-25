import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { Button, Input, Label } from '@/shared/ui'
import { toApiError } from '@/shared/api'
import {
  consultarRetenciones, RETENCIONES_TIPO, solicitarLiberacion, solicitarRetencion, type TipoRetencion,
} from '@/features/cuenta/api/retenciones.api'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'

type Modo = { tipo: 'alta' } | { tipo: 'liberar'; id: number }
const dinero = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

export function RetencionesCuenta({ idCuenta, activa }: { idCuenta: number; activa: boolean }) {
  const [modo, setModo] = useState<Modo | null>(null)
  const [aceptada, setAceptada] = useState<number | null>(null)
  const lista = useQuery({
    queryKey: ['cuentas', 'retenciones', idCuenta],
    queryFn: () => consultarRetenciones(idCuenta),
  })
  const enviar = useMutation({
    mutationFn: async (form: FormData) => {
      const motivo = String(form.get('motivo') ?? '').trim()
      if (modo?.tipo === 'liberar') return solicitarLiberacion(idCuenta, modo.id, motivo)
      return solicitarRetencion(idCuenta, {
        tipoRetencion: form.get('tipo') as TipoRetencion,
        monto: String(form.get('monto') ?? ''),
        motivo,
        documentoReferencia: String(form.get('documento') ?? '').trim(),
        fechaFin: String(form.get('fecha') ?? '') || null,
      })
    },
    onSuccess: ({ idSolicitud }) => {
      setAceptada(idSolicitud)
      setModo(null)
    },
  })

  function abrir(siguiente: Modo | null) {
    enviar.reset()
    setAceptada(null)
    setModo(siguiente)
  }

  function solicitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    enviar.mutate(new FormData(evento.currentTarget))
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-heading">Retenciones</h2>
        {activa && <Button onClick={() => abrir({ tipo: 'alta' })}>Solicitar retención</Button>}
      </div>
      {aceptada !== null && <p role="status">Solicitud #{aceptada} enviada a aprobación.</p>}
      {modo && (
        <form key={modo.tipo === 'alta' ? 'alta' : modo.id} className="space-y-4" onSubmit={solicitar}>
          <h3 className="font-semibold">{modo.tipo === 'alta' ? 'Nueva retención' : 'Liberar retención'}</h3>
          {modo.tipo === 'alta' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ret-tipo">Tipo</Label>
                <select id="ret-tipo" name="tipo" className="w-full rounded-md border border-border bg-background p-2">
                  {Object.entries(RETENCIONES_TIPO).map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
                </select>
              </div>
              <div><Label htmlFor="ret-monto">Monto (USD)</Label><Input id="ret-monto" name="monto" type="number" step="0.01" min="0.01" required /></div>
              <div><Label htmlFor="ret-documento">Documento de referencia</Label><Input id="ret-documento" name="documento" maxLength={60} required /></div>
              <div><Label htmlFor="ret-fecha">Fecha fin (opcional)</Label><Input id="ret-fecha" name="fecha" type="date" /></div>
            </div>
          )}
          <div><Label htmlFor="ret-motivo">Motivo</Label><Input id="ret-motivo" name="motivo" maxLength={250} required /></div>
          {enviar.isError && <Aviso tono="error">{toApiError(enviar.error).message}</Aviso>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={enviar.isPending}>Enviar a aprobación</Button>
            <Button type="button" variant="outline" onClick={() => abrir(null)}>Cancelar</Button>
          </div>
        </form>
      )}
      {lista.isPending && <Cargando texto="Consultando retenciones…" />}
      {lista.isError && <Aviso tono="error">{toApiError(lista.error).message}</Aviso>}
      {lista.data?.length === 0 && <Aviso>Esta cuenta no tiene retenciones registradas.</Aviso>}
      {lista.data?.map(ret => (
        <article key={ret.idRetencion} className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{RETENCIONES_TIPO[ret.tipoRetencion]} · {dinero.format(ret.monto)}</strong>
            <span>{ret.estado}</span>
          </div>
          <p>{ret.motivo} · {ret.documentoReferencia}</p>
          <p className="text-sm text-muted-foreground">{ret.fechaInicio}{ret.fechaFin ? ` a ${ret.fechaFin}` : ''}{ret.origen === 'Modulo' ? ' · Gestionada por el módulo de origen' : ''}</p>
          {ret.motivoLiberacion && <p>{ret.motivoLiberacion}</p>}
          {ret.estado === 'Activa' && ret.origen === 'Manual' && (
            <Button variant="outline" onClick={() => abrir({ tipo: 'liberar', id: ret.idRetencion })}>Solicitar liberación</Button>
          )}
        </article>
      ))}
    </section>
  )
}
