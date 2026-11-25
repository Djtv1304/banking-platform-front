import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { AvisoRequiereAprobacion, Button } from '@/shared/ui'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import { cambiarEstadoCliente, editarCliente, historialClienteKey, type ClienteUpdate, type EstadoDestino, type ResultadoEdicion } from '@/features/clientes/api/gestion-clientes'
import { CorreosCliente } from '@/features/clientes/components/CorreosCliente'
import { EditarClienteForm } from '@/features/clientes/components/EditarClienteForm'
import { EstadoClienteForm } from '@/features/clientes/components/EstadoClienteForm'
import { HistorialCliente } from '@/features/clientes/components/HistorialCliente'
import { accesoGestionClientes, estadosPermitidos } from '@/features/clientes/lib/gestion-clientes'

type Panel = 'edicion' | 'correos' | 'estado' | 'historial'

export function GestionCliente({ cliente }: { cliente: Cliente }) {
  const roles = useAuthStore((estado) => estado.user?.roles)
  const anterior = accesoGestionClientes(roles ?? [], usePermisos())
  const acceso = {
    consulta: usePuedeFuncion('clientes.consultar', anterior.consulta),
    edicion: usePuedeFuncion('clientes.editar', anterior.edicion),
    estado: usePuedeFuncion('clientes.cambiarEstado', anterior.estado),
    historial: usePuedeFuncion('clientes.verHistorial', anterior.historial),
    correos: usePuedeFuncion('clientes.correos.consultar', anterior.consulta),
    gestionarCorreos: usePuedeFuncion('clientes.correos.gestionar', anterior.edicion),
  }
  const [panel, setPanel] = useState<Panel | null>(null)
  const [aviso, setAviso] = useState('')
  const [solicitud, setSolicitud] = useState<number | null>(null)
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
  async function editado(resultado: ResultadoEdicion) {
    if (resultado.tipo === 'cliente') {
      await actualizado(resultado.cliente)
      setAviso('Datos guardados.')
    } else {
      // 202: el cliente no cambia hasta que otra persona apruebe la solicitud.
      setSolicitud(resultado.idSolicitud)
    }
  }
  const edicion = useMutation({ mutationFn: (cambios: ClienteUpdate) => editarCliente(cliente.idCliente, cambios), onSuccess: editado })
  const estado = useMutation({ mutationFn: ({ destino, motivo }: { destino: EstadoDestino; motivo: string }) => cambiarEstadoCliente(cliente.idCliente, destino, motivo), onSuccess: actualizado })
  const ocupado = edicion.isPending || estado.isPending
  const eliminado = cliente.estado === 'Eliminado'
  // E5-04: nada se edita con el cliente bloqueado; su estado sí puede cambiar.
  const editable = !eliminado && cliente.estado !== 'Bloqueado'
  const boton = (destino: Panel, texto: string) => (
    <Button type="button" variant={panel === destino ? 'default' : 'outline'} disabled={ocupado} onClick={() => setPanel(destino)}>{texto}</Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones del cliente">
        {acceso.edicion && editable && boton('edicion', 'Editar datos')}
        {acceso.correos && boton('correos', 'Correos')}
        {acceso.estado && !eliminado && boton('estado', 'Cambiar estado')}
        {acceso.historial && boton('historial', 'Ver historial')}
        {panel && <Button type="button" variant="ghost" disabled={ocupado} onClick={() => setPanel(null)}>Cerrar panel</Button>}
      </div>
      {cliente.estado === 'Bloqueado' && acceso.edicion && <p className="text-sm text-muted-foreground">El cliente está bloqueado: sus datos no se pueden editar hasta desbloquearlo.</p>}
      {aviso && <p role="status" className="text-sm text-link">{aviso}</p>}
      {solicitud !== null && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
      {panel === 'edicion' && acceso.edicion && editable && <EditarClienteForm cliente={cliente} ocupado={ocupado} error={edicion.error}
        guardar={async (cambios) => { setAviso(''); setSolicitud(null); await edicion.mutateAsync(cambios) }} />}
      {panel === 'correos' && acceso.correos && <CorreosCliente cliente={cliente} puedeGestionar={acceso.gestionarCorreos} />}
      {panel === 'estado' && acceso.estado && !eliminado && <EstadoClienteForm opciones={estadosPermitidos(cliente.estado)} ocupado={ocupado} error={estado.error}
        guardar={async (destino, motivo) => { setAviso(''); await estado.mutateAsync({ destino, motivo }); setAviso('Estado actualizado.'); }} />}
      {panel === 'historial' && acceso.historial && <HistorialCliente id={cliente.idCliente} />}
    </div>
  )
}
