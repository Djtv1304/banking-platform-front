import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { Button } from '@/shared/ui'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { cambiarEstadoCliente, editarCliente, historialClienteKey, type ClienteUpdate, type EstadoDestino } from '@/features/clientes/api/gestion-clientes'
import { EditarClienteForm } from '@/features/clientes/components/EditarClienteForm'
import { EstadoClienteForm } from '@/features/clientes/components/EstadoClienteForm'
import { HistorialCliente } from '@/features/clientes/components/HistorialCliente'
import { accesoGestionClientes, estadosPermitidos } from '@/features/clientes/lib/gestion-clientes'

export function GestionCliente({ cliente }: { cliente: Cliente }) {
  const roles = useAuthStore((estado) => estado.user?.roles)
  const anterior = accesoGestionClientes(roles ?? [], usePermisos())
  const acceso = {
    consulta: usePuedeFuncion('clientes.consultar', anterior.consulta),
    edicion: usePuedeFuncion('clientes.editar', anterior.edicion),
    estado: usePuedeFuncion('clientes.cambiarEstado', anterior.estado),
    historial: usePuedeFuncion('clientes.verHistorial', anterior.historial),
  }
  const [panel, setPanel] = useState<'edicion' | 'estado' | 'historial' | null>(null)
  const [aviso, setAviso] = useState('')
  const cache = useQueryClient()
  async function actualizado(datos: Cliente) {
    const key = ['clientes', 'detalle', cliente.idCliente]
    await cache.cancelQueries({ queryKey: key })
    cache.setQueryData(key, datos)
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['clientes', 'busqueda'] }),
      cache.invalidateQueries({ queryKey: historialClienteKey(cliente.idCliente) }),
    ])
  }
  const edicion = useMutation({ mutationFn: (cambios: ClienteUpdate) => editarCliente(cliente.idCliente, cambios), onSuccess: actualizado })
  const estado = useMutation({ mutationFn: ({ destino, motivo }: { destino: EstadoDestino; motivo: string }) => cambiarEstadoCliente(cliente.idCliente, destino, motivo), onSuccess: actualizado })
  const ocupado = edicion.isPending || estado.isPending
  const editable = cliente.estado !== 'Eliminado'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones del cliente">
        {acceso.edicion && editable && <Button type="button" variant={panel === 'edicion' ? 'default' : 'outline'} disabled={ocupado} onClick={() => setPanel('edicion')}>Editar datos</Button>}
        {acceso.estado && editable && <Button type="button" variant={panel === 'estado' ? 'default' : 'outline'} disabled={ocupado} onClick={() => setPanel('estado')}>Cambiar estado</Button>}
        {acceso.historial && <Button type="button" variant={panel === 'historial' ? 'default' : 'outline'} disabled={ocupado} onClick={() => setPanel('historial')}>Ver historial</Button>}
        {panel && <Button type="button" variant="ghost" disabled={ocupado} onClick={() => setPanel(null)}>Cerrar panel</Button>}
      </div>
      {aviso && <p role="status" className="text-sm text-link">{aviso}</p>}
      {panel === 'edicion' && acceso.edicion && editable && <EditarClienteForm cliente={cliente} ocupado={ocupado} error={edicion.error}
        guardar={async (cambios) => { setAviso(''); await edicion.mutateAsync(cambios); setAviso('Datos guardados.'); }} />}
      {panel === 'estado' && acceso.estado && editable && <EstadoClienteForm opciones={estadosPermitidos(cliente.estado)} ocupado={ocupado} error={estado.error}
        guardar={async (destino, motivo) => { setAviso(''); await estado.mutateAsync({ destino, motivo }); setAviso('Estado actualizado.'); }} />}
      {panel === 'historial' && acceso.historial && <HistorialCliente id={cliente.idCliente} />}
    </div>
  )
}
