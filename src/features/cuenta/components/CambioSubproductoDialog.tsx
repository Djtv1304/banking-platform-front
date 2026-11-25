import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import { z } from 'zod'

import { apiClient } from '@/shared/api'
import { Button, ErrorApi } from '@/shared/ui'
import { fichaSubProductoSchema, type FichaSubProducto } from '@/features/organizacion/api/productos.contract'
import { formatearMonto } from '@/features/cuenta/lib/formato'

const destinosSchema = z.object({
  actual: fichaSubProductoSchema,
  destinos: z.array(fichaSubProductoSchema),
})
const solicitudSchema = z.object({
  idSolicitud: z.number().int().positive(),
  estado: z.literal('Pendiente'),
  requiereAprobacion: z.literal(true),
})

export function CambioSubproductoDialog({ idCuenta }: { idCuenta: number }) {
  const [abierto, setAbierto] = useState(false)
  const [destinoId, setDestinoId] = useState('')
  const ruta = `/api/v1/cuentas/${idCuenta}`
  const destinos = useQuery({
    queryKey: ['subproductos-destino', idCuenta],
    enabled: abierto,
    queryFn: async () => destinosSchema.parse((await apiClient.get(`${ruta}/subproductos-destino`)).data),
  })
  const solicitud = useMutation({
    mutationFn: async (idSubProducto: number) => solicitudSchema.parse(
      (await apiClient.post(`${ruta}/subproducto`, { idSubProducto })).data,
    ),
  })
  const fichaDestino = destinos.data?.destinos.find(ficha => String(ficha.subproducto.idSubProducto) === destinoId)

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="lg">Cambiar subproducto</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90vh] max-w-4xl -translate-y-1/2 overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Cambiar subproducto</Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-muted-foreground">
            La cuenta mantiene su número. Los cambios se aplican después de la aprobación.
          </Dialog.Description>
          {solicitud.isSuccess ? (
            <p role="status">
              <Link className="underline" to={`/aprobaciones/${solicitud.data.idSolicitud}`}>
                Solicitud {solicitud.data.idSolicitud}
              </Link>
              {' '}pendiente de aprobación.
            </p>
          ) : destinos.isPending ? (
            <p role="status">Consultando subproductos…</p>
          ) : destinos.isError ? <ErrorApi error={destinos.error} /> : (
            <form className="grid gap-4" onSubmit={event => {
              event.preventDefault()
              if (fichaDestino && !solicitud.isPending) solicitud.mutate(fichaDestino.subproducto.idSubProducto)
            }}>
              {destinos.data.destinos.length > 0 ? (
                <label className="grid gap-2 text-sm font-medium">
                  Subproducto de destino
                  <select className="rounded-lg border border-border bg-background p-2" value={destinoId}
                    onChange={event => { setDestinoId(event.target.value); solicitud.reset() }}>
                    <option value="">Seleccione un subproducto</option>
                    {destinos.data.destinos.map(ficha => (
                      <option key={ficha.subproducto.idSubProducto} value={ficha.subproducto.idSubProducto}>
                        {ficha.producto.nombreProducto} · {ficha.subproducto.nombreSubProducto}
                      </option>
                    ))}
                  </select>
                </label>
              ) : <p>No hay subproductos de destino compatibles para este titular.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <Ficha titulo="Actual" ficha={destinos.data.actual} />
                {fichaDestino && <Ficha titulo="Destino" ficha={fichaDestino} />}
              </div>
              {solicitud.isError && <ErrorApi error={solicitud.error} />}
              <Button type="submit" className="w-fit" disabled={!fichaDestino || solicitud.isPending}>
                Solicitar aprobación
              </Button>
            </form>
          )}
          <Dialog.Close asChild className="mt-4">
            <Button variant="ghost">Cerrar</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Ficha({ titulo, ficha }: { titulo: string; ficha: FichaSubProducto }) {
  const { condiciones, restricciones } = ficha
  return (
    <section className="grid content-start gap-2 rounded-xl border border-border p-4 text-sm">
      <h3 className="font-semibold">{titulo} · {ficha.subproducto.nombreSubProducto}</h3>
      <p>{ficha.producto.nombreProducto}</p>
      {condiciones && (
        <dl className="grid gap-1">
          <Dato etiqueta="Depósito mínimo de apertura">{formatearMonto(condiciones.montoAperturaMinimo)}</Dato>
          <Dato etiqueta="Saldo mínimo">{formatearMonto(condiciones.saldoMinimo)}</Dato>
          <Dato etiqueta="Interés anual">{condiciones.tasaInteresAnual} % {condiciones.periodicidadInteres}</Dato>
          <Dato etiqueta="Mantenimiento">{formatearMonto(condiciones.costoMantenimiento)} {condiciones.periodicidadCosto}</Dato>
          {condiciones.mesesInactividad != null && <Dato etiqueta="Inactividad">{condiciones.mesesInactividad} meses</Dato>}
        </dl>
      )}
      <h4 className="font-medium">Cupos por canal</h4>
      {ficha.cupos.length ? (
        <ul className="grid gap-1">
          {ficha.cupos.map(cupo => (
            <li key={cupo.idCanal}>
              {cupo.nombreCanal} · {montoCupo(cupo.cupoDiarioMaximo)} diarios, {montoCupo(cupo.cupoMensualMaximo)} mensuales,
              {' '}{montoCupo(cupo.montoMaxTransaccion)} por operación, {cupo.maxTransaccionesDia ?? '—'} operaciones por día.
            </li>
          ))}
        </ul>
      ) : <p>Sin cupos configurados.</p>}
      <h4 className="font-medium">Restricciones</h4>
      <p>{ficha.elegibilidad.requiereTutor ? 'Requiere tutor' : 'Sin requisito de tutor'}</p>
      <p>{ficha.producto.permiteOperacionesPresenciales ? 'Permite operaciones presenciales' : 'Operaciones presenciales restringidas'}</p>
      {restricciones?.saldoMinimo != null && <p>Saldo mínimo de operación: {formatearMonto(restricciones.saldoMinimo)}</p>}
      {restricciones?.diasSinRetiros != null && <p>Sin retiros durante {restricciones.diasSinRetiros} días desde la apertura.</p>}
    </section>
  )
}

function montoCupo(monto: number | null | undefined) {
  return monto == null ? '—' : formatearMonto(monto)
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <div className="flex justify-between gap-2"><dt>{etiqueta}</dt><dd className="font-medium">{children}</dd></div>
}
