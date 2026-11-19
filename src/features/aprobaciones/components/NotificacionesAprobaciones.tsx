import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { obtenerNotificaciones } from '@/features/aprobaciones/api/aprobaciones.api'
import { useAccesosAprobaciones, useClaveAprobaciones } from '@/features/aprobaciones/hooks/useAprobaciones'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui'
import { DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import type { Solicitud } from '@/features/aprobaciones/api/aprobaciones.contract'

function clave(s: Solicitud) { return `${s.idSolicitud}:${s.estado}` }
function leerLeidas(usuario: string): string[] {
  try { const valor: unknown = JSON.parse(localStorage.getItem(`aprobaciones-leidas:${usuario}`) ?? '[]'); return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string').slice(-500) : [] } catch { return [] }
}
const ESTADOS: Record<string, string> = { Aprobada: 'fue aprobada y esta pendiente de aplicacion', Ejecutada: 'fue aprobada y aplicada', Rechazada: 'fue rechazada', Cancelada: 'fue cancelada', Fallida: 'no pudo aplicarse' }
export function NotificacionesAprobaciones() {
  const usuario = useAuthStore(s => s.user?.idUsuario ?? '')
  return <AvisosDeUsuario key={usuario} usuario={usuario} />
}
function AvisosDeUsuario({ usuario }: { usuario: string }) {
  const accesos = useAccesosAprobaciones(), key = useClaveAprobaciones()
  const [leidas, setLeidas] = useState(() => leerLeidas(usuario))
  const consulta = useQuery({ queryKey: [...key, 'notificaciones'], queryFn: obtenerNotificaciones, enabled: Boolean(usuario) && accesos.data?.puedeVer === true, retry: false, staleTime: 15_000, refetchInterval: 30_000, refetchIntervalInBackground: false })
  const items = consulta.data?.items ?? [], nuevas = items.filter(s => !leidas.includes(clave(s))).length
  const marcar = (solicitudes: Solicitud[]) => {
    const siguientes = [...new Set([...leidas, ...solicitudes.map(clave)])].slice(-500)
    setLeidas(siguientes)
    try { localStorage.setItem(`aprobaciones-leidas:${usuario}`, JSON.stringify(siguientes)) } catch { /* La lectura sigue disponible sin almacenamiento local. */ }
  }
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={nuevas ? `Notificaciones: ${nuevas} sin leer` : 'Notificaciones'} title="Notificaciones" className="relative size-9 rounded-lg text-muted-foreground"><Bell className="size-[18px]" />{nuevas > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{nuevas > 99 ? '99+' : nuevas}</span>}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-2"><DropdownMenuLabel>Solicitudes y resoluciones</DropdownMenuLabel><DropdownMenuSeparator />
    {consulta.isError || accesos.isError ? <p role="alert" className="p-3 text-sm">No se pudieron consultar las notificaciones.</p> : consulta.isPending && accesos.data?.puedeVer ? <p className="p-3 text-sm">Consultando notificaciones...</p> : !items.length ? <p className="p-3 text-sm text-muted-foreground">No tienes notificaciones de aprobaciones.</p> : <div className="max-h-80 overflow-y-auto">{items.map(s => <DropdownMenuItem key={clave(s)} asChild className="items-start whitespace-normal py-3"><Link to={`/aprobaciones/${s.idSolicitud}`} onClick={() => marcar([s])}><span className="flex flex-col gap-1"><span className={leidas.includes(clave(s)) ? 'text-muted-foreground' : 'font-semibold'}>{s.estado === 'Pendiente' ? `Solicitud #${s.idSolicitud} pendiente de tu revision` : `Tu solicitud #${s.idSolicitud} ${ESTADOS[s.estado] ?? 'cambio de estado'}`}</span><span className="text-xs text-muted-foreground">{s.tipoObjetivo === 'SubProducto' ? 'Modelo comercial' : s.tipoObjetivo} {s.idObjetivo} · {new Date(s.fechaResolucion ?? s.fechaSolicitud).toLocaleString('es-EC')}</span></span></Link></DropdownMenuItem>)}</div>}
    {items.length > 0 && <><DropdownMenuSeparator /><Button variant="ghost" className="w-full text-sm" onClick={() => marcar(items)}>Marcar como leidas</Button></>}<DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/aprobaciones">Ver todas las solicitudes</Link></DropdownMenuItem>
    {(consulta.data?.total ?? 0) > items.length && <p className="px-2 py-1 text-xs text-muted-foreground">Se muestran las 50 notificaciones mas recientes.</p>}
  </DropdownMenuContent></DropdownMenu>
}
