import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { historialClienteKey, obtenerHistorial } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes, PaginacionClientes } from '@/features/clientes/components/consulta-clientes'

const detalleAuditoria = z.object({
  v: z.literal(1),
  valorNuevo: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  motivo: z.string(),
})

function leerDetalle(observaciones: string) {
  try {
    const detalle = detalleAuditoria.safeParse(JSON.parse(observaciones))
    if (detalle.success) return { nuevo: detalle.data.valorNuevo, motivo: detalle.data.motivo }
  } catch {
    // Los registros legados pueden tener observaciones en texto plano.
  }
  return { nuevo: null, motivo: observaciones }
}

export function HistorialCliente({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const consulta = useQuery({
    queryKey: [...historialClienteKey(id), page],
    queryFn: ({ signal }) => obtenerHistorial(id, page, signal),
    gcTime: 0,
  })

  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold text-heading">Historial de cambios</h2>
      {consulta.isPending && <p role="status">Cargando historial…</p>}
      {consulta.isError && <ErrorClientes error={consulta.error} reintentar={() => void consulta.refetch()} />}
      {consulta.data && (
        <>
          {consulta.data.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Fecha', 'Operación', 'Campo', 'Valor anterior', 'Valor nuevo', 'Usuario e IP', 'Motivo u observaciones'].map((titulo) => (
                      <th key={titulo} scope="col" className="p-2">{titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consulta.data.items.map((cambio) => {
                    const detalle = leerDetalle(cambio.observaciones)
                    return (
                      <tr key={cambio.idHistorial} className="border-b border-border align-top">
                        <td className="p-2"><time dateTime={cambio.fechaModificacion}>{cambio.fechaModificacion.replace('T', ' ')}</time></td>
                        <td className="p-2">{cambio.tipoOperacion}</td>
                        <td className="p-2">{cambio.campoModificado}</td>
                        <td className="p-2 wrap-break-word">{cambio.valorAnterior ?? '—'}</td>
                        <td className="p-2 wrap-break-word">{detalle.nuevo === null ? '—' : String(detalle.nuevo)}</td>
                        <td className="p-2">ID {cambio.modificadoPor}<br />{cambio.direccionIP}</td>
                        <td className="p-2 wrap-break-word">{detalle.motivo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <p role="status">Todavía no hay cambios registrados.</p>}
          <PaginacionClientes {...consulta.data} cambiar={setPage} />
        </>
      )}
    </section>
  )
}
