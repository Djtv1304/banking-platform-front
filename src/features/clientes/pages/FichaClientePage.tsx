import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router'

import { useAuthStore } from '@/features/auth'
import {
  cambiarEstadoCliente, detalleClienteKey, editarCliente, historialClienteKey, listaClientesKey, obtenerCliente,
  type Cliente, type ClienteUpdate, type EstadoDestino,
} from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'
import { EditarClienteForm } from '@/features/clientes/components/EditarClienteForm'
import { EstadoClienteForm } from '@/features/clientes/components/EstadoClienteForm'
import { HistorialCliente } from '@/features/clientes/components/HistorialCliente'
import { accesoGestionClientes, estadosPermitidos, nombreCliente } from '@/features/clientes/lib/gestion-clientes'
import { Badge, Button } from '@/shared/ui'

type AccesoCliente = ReturnType<typeof accesoGestionClientes>

export function FichaClientePage() {
  const { idCliente } = useParams()
  const id = Number(idCliente)
  const roles = useAuthStore((state) => state.user?.roles)
  const acceso = accesoGestionClientes(roles ?? [])

  if (!acceso.consulta && !acceso.historial) return <Navigate to="/" replace />

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-5">
      <Button asChild variant="outline" className="justify-self-start"><Link to="/clientes">Volver a clientes</Link></Button>
      {!/^\d+$/.test(idCliente ?? '') || !Number.isSafeInteger(id) || id <= 0 ? (
        <p role="alert">El ID del cliente no es válido.</p>
      ) : acceso.consulta ? (
        <FichaCliente key={id} id={id} acceso={acceso} />
      ) : (
        <HistorialCliente key={id} id={id} />
      )}
    </section>
  )
}

function FichaCliente({ id, acceso }: { id: number; acceso: AccesoCliente }) {
  const cache = useQueryClient()
  const [verHistorial, setVerHistorial] = useState(false)
  const [aviso, setAviso] = useState('')
  const consulta = useQuery({
    queryKey: detalleClienteKey(id),
    queryFn: ({ signal }) => obtenerCliente(id, signal),
    gcTime: 0,
  })

  async function actualizado(cliente: Cliente) {
    await cache.cancelQueries({ queryKey: detalleClienteKey(id) })
    cache.setQueryData(detalleClienteKey(id), cliente)
    void cache.invalidateQueries({ queryKey: listaClientesKey })
    void cache.invalidateQueries({ queryKey: historialClienteKey(id) })
  }

  const edicion = useMutation({
    mutationFn: (cambios: ClienteUpdate) => editarCliente(id, cambios),
    onSuccess: actualizado,
    gcTime: 0,
  })
  const estado = useMutation({
    mutationFn: ({ destino, motivo }: { destino: EstadoDestino; motivo: string }) => cambiarEstadoCliente(id, destino, motivo),
    onSuccess: actualizado,
    gcTime: 0,
  })
  const cliente = consulta.data
  const ocupado = edicion.isPending || estado.isPending
  if (consulta.isPending) return <p role="status">Cargando ficha…</p>
  if (consulta.isError) return <ErrorClientes error={consulta.error} reintentar={() => void consulta.refetch()} />
  if (!cliente) return null

  return (
    <>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-heading">{nombreCliente(cliente)}</h1>
          <Badge>{cliente.estado}</Badge>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <div><dt className="font-semibold">Identificación</dt><dd>{cliente.identificacion}</dd></div>
          <div><dt className="font-semibold">Tipo de cliente</dt><dd>{cliente.tipoCliente === 'Juridico' ? 'Jurídico' : 'Natural'}</dd></div>
          <div><dt className="font-semibold">ID interno</dt><dd>{cliente.idCliente}</dd></div>
        </dl>
      </header>
      <p role="status" className="text-sm text-muted-foreground">{aviso}</p>
      {acceso.edicion && cliente.estado !== 'Eliminado' && (
        <EditarClienteForm cliente={cliente} ocupado={ocupado} error={edicion.error}
          guardar={async (cambios) => {
            setAviso('')
            await edicion.mutateAsync(cambios)
            setAviso('Datos guardados.')
          }} />
      )}
      {acceso.estado && (
        <EstadoClienteForm opciones={estadosPermitidos(cliente.estado)} ocupado={ocupado}
          error={estado.error} guardar={async (destino, motivo) => {
            setAviso('')
            await estado.mutateAsync({ destino, motivo })
            setAviso('Estado actualizado.')
          }} />
      )}
      {acceso.historial && (
        <>
          <Button type="button" variant="outline" aria-expanded={verHistorial} className="justify-self-start"
            onClick={() => setVerHistorial(!verHistorial)}>
            {verHistorial ? 'Ocultar historial' : 'Ver historial'}
          </Button>
          {verHistorial && <HistorialCliente id={id} />}
        </>
      )}
    </>
  )
}
