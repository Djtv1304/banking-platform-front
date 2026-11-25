import { type FormEvent, useState } from 'react'

import { toApiError } from '@/shared/api'
import { Aviso, Button } from '@/shared/ui'
import type { Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { useRegistrarEnvio } from '@/features/tarjetas/hooks/useAccionesTarjeta'
import { formatearFechaHora } from '@/features/tarjetas/lib/acciones-tarjeta'

export function EnvioTarjeta({ tarjeta, editar }: { tarjeta: Tarjeta; editar: boolean }) {
  const despacho = useRegistrarEnvio(tarjeta.idTarjeta)
  const [codigo, setCodigo] = useState(tarjeta.envio?.codigoSeguimiento ?? '')
  const envio = tarjeta.envio
  if (!envio) return null
  const puedeEditar = editar && tarjeta.estadoActual === 'Generada'

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (/^[A-Za-z0-9_-]{1,64}$/.test(codigo.trim())) despacho.mutate(codigo.trim())
  }

  return (
    <section aria-labelledby="envio-tarjeta" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 id="envio-tarjeta" className="text-lg font-semibold text-heading">Envío</h2>
      <p className="text-sm text-muted-foreground">
        {envio.estadoEnvio}
        {envio.despachadoEn && ` · ${formatearFechaHora(envio.despachadoEn)}`}
      </p>
      {!puedeEditar && envio.codigoSeguimiento && <p className="text-sm text-heading">{envio.codigoSeguimiento}</p>}
      {puedeEditar && (
        <form onSubmit={enviar} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <label className="flex w-full max-w-sm flex-col gap-1 text-sm font-medium">
            Código de seguimiento
            <input required maxLength={64} pattern="[A-Za-z0-9_\\-]+" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <Button type="submit" disabled={despacho.isPending || !codigo.trim() || codigo.trim() === envio.codigoSeguimiento}>
            {envio.despachadoEn ? 'Actualizar seguimiento' : 'Registrar despacho'}
          </Button>
        </form>
      )}
      {despacho.isError && <Aviso tono="error">{toApiError(despacho.error).message}</Aviso>}
    </section>
  )
}
