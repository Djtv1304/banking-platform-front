import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ErrorApi, Paginacion } from '@/shared/ui'
import { AUDITORIA_ROLES, hasAnyRole, useAuthStore } from '@/features/auth'
import { obtenerEventosObjetivo } from '@/features/auditoria/api/auditoria.api'
import { TablaEventos } from '@/features/auditoria/components/TablaEventos'

const PAGE_SIZE = 10

export interface PestanaHistorialProps {
  /** Tipo de objetivo de la bitácora, p. ej. `Clientes.Cliente` */
  tipo: string
  /** Identificador interno del objetivo (nunca un documento ni un número de cuenta) */
  id: string | number
  titulo?: string
}

/**
 * E8-01 · Pestaña Historial reutilizable: los eventos de auditoría de un cliente, cuenta, usuario o producto.
 * No se muestra a quien no tiene los roles de lectura de la bitácora; la API vuelve a validarlo.
 */
export function PestanaHistorial({ tipo, id, titulo = 'Historial de auditoría' }: PestanaHistorialProps) {
  const roles = useAuthStore((state) => state.user?.roles)
  if (!roles || !hasAnyRole(roles, AUDITORIA_ROLES)) return null
  return <ContenidoHistorial tipo={tipo} id={id} titulo={titulo} />
}

function ContenidoHistorial({ tipo, id, titulo }: Required<PestanaHistorialProps>) {
  const [page, setPage] = useState(1)
  const consulta = useQuery({
    queryKey: ['auditoria', 'objetivo', tipo, String(id), page],
    queryFn: () => obtenerEventosObjetivo(tipo, id, page, PAGE_SIZE),
    // ASVS 14.3.1: la bitácora no queda en la caché del cliente al salir de la pantalla
    gcTime: 0,
  })
  const totalPaginas = consulta.data ? Math.max(1, Math.ceil(consulta.data.total / PAGE_SIZE)) : 1

  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold text-heading">{titulo}</h2>
      {consulta.isPending && <p role="status">Cargando historial de auditoría…</p>}
      {consulta.isError && <ErrorApi error={consulta.error} reintentar={() => void consulta.refetch()} />}
      {consulta.data && (
        <>
          {consulta.data.items.length
            ? <TablaEventos eventos={consulta.data.items} titulo={titulo} />
            : <p role="status">No hay eventos de auditoría registrados.</p>}
          <Paginacion
            resumen={`${consulta.data.total} eventos · página ${page} de ${totalPaginas}`}
            page={page}
            totalPaginas={totalPaginas}
            ocupado={consulta.isFetching}
            onCambiar={setPage}
          />
        </>
      )}
    </section>
  )
}
