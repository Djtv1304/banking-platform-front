import { useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'

import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import {
  AvisoRequiereAprobacion, Button, Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogoConfirmacion, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/ui'
import type { Cliente } from '@/features/clientes/api/clientes.contract'
import {
  cambiarEstadoCliente,
  editarCliente,
  historialClienteKey,
  type ClienteUpdate,
  type EstadoDestino,
  type ResultadoCambioEstado,
  type ResultadoEdicion,
} from '@/features/clientes/api/gestion-clientes'
import { CorreosCliente } from '@/features/clientes/components/CorreosCliente'
import { EditarClienteForm } from '@/features/clientes/components/EditarClienteForm'
import { EstadoClienteForm } from '@/features/clientes/components/EstadoClienteForm'
import { HistorialCliente } from '@/features/clientes/components/HistorialCliente'
import { accesoGestionClientes, estadosPermitidos } from '@/features/clientes/lib/gestion-clientes'

type Panel = 'edicion' | 'correos' | 'estado' | 'historial'

const ACCIONES: { panel: Panel; etiqueta: string; titulo: string }[] = [
  { panel: 'edicion', etiqueta: 'Editar datos', titulo: 'Editar datos del cliente' },
  { panel: 'correos', etiqueta: 'Correos', titulo: 'Correos del cliente' },
  { panel: 'estado', etiqueta: 'Cambiar estado', titulo: 'Estado del cliente' },
  { panel: 'historial', etiqueta: 'Ver historial', titulo: 'Historial del cliente' },
]

export function GestionCliente({ cliente, children }: { cliente: Cliente; children: ReactNode }) {
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
  const [hayBorrador, setHayBorrador] = useState(false)
  const [correosOcupados, setCorreosOcupados] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const disparador = useRef<HTMLButtonElement>(null)
  const abriendoDialogo = useRef(false)
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
  async function estadoCambiado(resultado: ResultadoCambioEstado) {
    if (resultado.tipo === 'cliente') {
      await actualizado(resultado.cliente)
      setAviso('Estado actualizado.')
    } else {
      // 202: el cliente no cambia hasta que otra persona apruebe la solicitud.
      setSolicitud(resultado.idSolicitud)
    }
  }
  const edicion = useMutation({ mutationFn: (cambios: ClienteUpdate) => editarCliente(cliente.idCliente, cambios), onSuccess: editado })
  const estado = useMutation({
    mutationFn: ({ destino, motivo }: { destino: EstadoDestino; motivo: string }) => cambiarEstadoCliente(cliente.idCliente, destino, motivo),
    onSuccess: estadoCambiado,
  })
  const ocupado = edicion.isPending || estado.isPending || correosOcupados
  const eliminado = cliente.estado === 'Eliminado'
  // E5-04: nada se edita con el cliente bloqueado; su estado sí puede cambiar.
  const editable = !eliminado && cliente.estado !== 'Bloqueado'
  const permitidos = {
    edicion: acceso.edicion && editable, correos: acceso.correos,
    estado: acceso.estado && !eliminado, historial: acceso.historial,
  }
  const opciones = ACCIONES.filter(accion => permitidos[accion.panel])
  const activa = opciones.find(accion => accion.panel === panel)
  const cerrar = () => {
    setConfirmarCierre(false)
    setHayBorrador(false)
    setCorreosOcupados(false)
    setPanel(null)
  }
  const solicitarCierre = () => {
    if (ocupado) return
    if (hayBorrador) setConfirmarCierre(true)
    else cerrar()
  }

  const resultado = <>
    {aviso && <p role="status" className="text-sm text-link">{aviso}</p>}
    {solicitud !== null && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
  </>

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        {children}
        {opciones.length > 0 && <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={disparador} type="button" variant="outline">Acciones <ChevronDown aria-hidden /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44" onCloseAutoFocus={evento => {
            if (abriendoDialogo.current) {
              evento.preventDefault()
              abriendoDialogo.current = false
            }
          }}>
            {opciones.map(accion => <DropdownMenuItem key={accion.panel} onSelect={() => {
              abriendoDialogo.current = true
              setAviso('')
              setSolicitud(null)
              setHayBorrador(false)
              setCorreosOcupados(false)
              setConfirmarCierre(false)
              edicion.reset()
              estado.reset()
              setPanel(accion.panel)
            }}>{accion.etiqueta}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>}
      </header>
      {cliente.estado === 'Bloqueado' && acceso.edicion && <p className="text-sm text-muted-foreground">El cliente está bloqueado: sus datos no se pueden editar hasta desbloquearlo.</p>}
      {cliente.motivoEstado && (
        <p className="text-sm text-muted-foreground">
          Estado: <span className="font-semibold text-heading">{cliente.estado}</span> · Motivo: {cliente.motivoEstado}
        </p>
      )}
      {!activa && resultado}
      <Dialog open={Boolean(activa)} onOpenChange={abierto => { if (!abierto) solicitarCierre() }}>
        {activa && <DialogContent showCloseButton={!ocupado}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          onInteractOutside={evento => evento.preventDefault()}
          onCloseAutoFocus={evento => { evento.preventDefault(); disparador.current?.focus() }}>
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-14 sm:px-6 sm:pr-14">
            <DialogTitle>{activa.titulo}</DialogTitle>
            <DialogDescription>Ficha del cliente #{cliente.idCliente}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
            {resultado}
            {activa.panel === 'edicion' && <EditarClienteForm cliente={cliente} ocupado={ocupado} error={edicion.error}
              onBorrador={setHayBorrador}
              guardar={async (cambios) => { setAviso(''); setSolicitud(null); await edicion.mutateAsync(cambios) }} />}
            {activa.panel === 'correos' && <CorreosCliente cliente={cliente} puedeGestionar={acceso.gestionarCorreos}
              onBorrador={setHayBorrador} onProcesando={setCorreosOcupados} />}
            {activa.panel === 'estado' && <EstadoClienteForm estadoActual={cliente.estado} opciones={estadosPermitidos(cliente.estado)} ocupado={ocupado}
              error={estado.error} onBorrador={setHayBorrador}
              guardar={async (destino, motivo) => { setAviso(''); setSolicitud(null); await estado.mutateAsync({ destino, motivo }) }} />}
            {activa.panel === 'historial' && <HistorialCliente id={cliente.idCliente} />}
          </div>
        </DialogContent>}
      </Dialog>
      {activa && <DialogoConfirmacion abierto={confirmarCierre} onAbiertoChange={setConfirmarCierre}
        titulo="¿Descartar cambios?" descripcion="Los cambios sin guardar se perderán al cerrar."
        textoConfirmar="Descartar cambios" destructiva onConfirmar={cerrar} />}
    </div>
  )
}
