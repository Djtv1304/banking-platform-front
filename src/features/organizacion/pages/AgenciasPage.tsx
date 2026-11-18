import { useRef, useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Input, Label, Paginacion } from '@/shared/ui'
import { AvisoRequiereAprobacion } from '@/features/aprobaciones'
import { useCiudades } from '@/features/catalogos'
import type { AgenciaDetalle } from '@/features/organizacion/api/agencias.contract'
import { useAgenciasAdmin } from '@/features/organizacion/hooks/useAgenciasAdmin'
import { mensajeErrorAgencia } from '@/features/organizacion/lib/agencia-form'
import { AgenciaFormDialog, type ModoAgencia } from '@/features/organizacion/components/AgenciaFormDialog'
import { CambiarEstadoAgenciaDialog, type CambioEstado } from '@/features/organizacion/components/CambiarEstadoAgenciaDialog'
import { EstadoAgenciaBadge } from '@/features/organizacion/components/EstadoAgenciaBadge'
import { accionEstado, ETIQUETA_ESTADO } from '@/features/organizacion/lib/agencias'

const TAMANO_PAGINA = 10
export function AgenciasPage() {
  const agencias = useAgenciasAdmin()
  const ciudades = useCiudades('ECU')
  const [filtro, setFiltro] = useState('')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const botonNueva = useRef<HTMLButtonElement>(null)
  const disparador = useRef<HTMLElement | null>(null)
  const restaurarFoco = () => {
    const objetivo = disparador.current?.isConnected ? disparador.current : botonNueva.current
    objetivo?.focus()
  }
  const [formulario, setFormulario] = useState<ModoAgencia | null>(null)
  const [cambio, setCambio] = useState<CambioEstado | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | number | null>(null)

  const abrirFormulario = (modo: ModoAgencia) => {
    disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmacion(null)
    setFormulario(modo)
  }

  const abrirCambio = (nuevo: CambioEstado) => {
    disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmacion(null)
    setCambio(nuevo)
  }

  const alGuardar = (mensaje: string | number) => {
    setFormulario(null)
    setCambio(null)
    setConfirmacion(mensaje)
  }

  const contenido = (() => {
    if (agencias.isError) {
      const error = toApiError(agencias.error)
      return <Aviso tono="error">
        {mensajeErrorAgencia(error)}
        {error.status !== 403 && <Button variant="outline" disabled={agencias.isFetching} onClick={() => void agencias.refetch()}>Reintentar</Button>}
      </Aviso>
    }
    if (agencias.isPending) return <Cargando texto="Cargando agencias…" />
    if (agencias.data.length === 0) return <Aviso>Todavía no hay agencias registradas.</Aviso>
    const busqueda = filtro.trim().toUpperCase()
    const filtradas = agencias.data.filter((agencia) =>
      (!estado || agencia.estado === estado) &&
      (agencia.codigo.toUpperCase().includes(busqueda) || agencia.idAgencia.includes(busqueda)),
    )
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA))
    const actual = Math.min(pagina, totalPaginas)
    const inicio = (actual - 1) * TAMANO_PAGINA

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="filtro-agencia">Código o ID</Label>
            <Input id="filtro-agencia" value={filtro} onChange={(event) => { setFiltro(event.target.value); setPagina(1) }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-estado-agencia">Estado</Label>
            <select id="filtro-estado-agencia" className="block h-9 rounded-md border border-input bg-field px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring" value={estado} onChange={(event) => { setEstado(event.target.value); setPagina(1) }}>
              <option value="">Todos</option>
              {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </div>
        </div>
        {filtradas.length === 0 ? <Aviso>No hay agencias que coincidan con los filtros.</Aviso> : (
          <>
            <TablaAgencias
              agencias={filtradas.slice(inicio, inicio + TAMANO_PAGINA)}
              ciudades={ciudades.data}
              onEditar={(agencia) => abrirFormulario({ tipo: 'editar', agencia })}
              onCambiarEstado={abrirCambio}
            />
            <Paginacion
              resumen={`${inicio + 1}–${Math.min(inicio + TAMANO_PAGINA, filtradas.length)} de ${filtradas.length} agencias`}
              page={actual}
              totalPaginas={totalPaginas}
              ocupado={false}
              onCambiar={setPagina}
            />
          </>
        )}
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Agencias</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Matriz y sucursales de la cooperativa. Crea agencias, corrige sus datos o cambia su estado.
          </p>
        </div>
        <Button ref={botonNueva} disabled={!agencias.isSuccess} size="lg" onClick={() => abrirFormulario({ tipo: 'crear' })} className="rounded-lg px-4 font-semibold">
          <Plus />
          Nueva agencia
        </Button>
      </header>

      {typeof confirmacion === 'number' ? <AvisoRequiereAprobacion idSolicitud={confirmacion} /> : confirmacion && <Aviso>{confirmacion}</Aviso>}

      <section aria-label="Agencias" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {contenido}
      </section>

      <AgenciaFormDialog modo={formulario} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} onRestaurarFoco={restaurarFoco} />
      <CambiarEstadoAgenciaDialog cambio={cambio} onCerrar={() => setCambio(null)} onGuardado={alGuardar} onRestaurarFoco={restaurarFoco} />
    </div>
  )
}

interface TablaAgenciasProps {
  agencias: AgenciaDetalle[]
  ciudades: readonly { idCiudad: number; nombre: string; provincia: string }[]
  onEditar: (agencia: AgenciaDetalle) => void
  onCambiarEstado: (cambio: CambioEstado) => void
}

function TablaAgencias({ agencias, ciudades, onEditar, onCambiarEstado }: TablaAgenciasProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Listado administrativo de agencias</caption>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">
              Código
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Ciudad
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Estado
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {agencias.map((agencia) => {
            const accion = accionEstado(agencia.estado)
            const ciudad = ciudades.find((item) => item.idCiudad === agencia.idCiudad)
            return (
              <tr key={agencia.idAgencia} className="border-b border-border">
                <td className="px-3 py-3">
                  <span className="block font-semibold text-heading">{agencia.codigo}</span>
                  <span className="text-xs text-muted-foreground">ID {agencia.idAgencia}</span>
                </td>
                <td className="px-3 py-3 text-heading">{agencia.tipoAgencia}</td>
                <td className="px-3 py-3">
                  <span className="block text-heading">{ciudad?.nombre ?? `Ciudad ${agencia.idCiudad}`}</span>
                  <span className="text-xs text-muted-foreground">{ciudad?.provincia}</span>
                </td>
                <td className="px-3 py-3">
                  <EstadoAgenciaBadge estado={agencia.estado} />
                </td>
                <td className="px-3 py-3">
                  {/* Una agencia cerrada no tiene acciones: la API no la gestiona */}
                  {accion ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEditar(agencia)} aria-label={`Editar ${agencia.codigo}`}>
                        <Pencil />
                        Editar
                      </Button>
                      <Button
                        variant={accion === 'desactivar' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => onCambiarEstado({ agencia, accion })}
                        aria-label={`${accion === 'desactivar' ? 'Desactivar' : 'Activar'} ${agencia.codigo}`}
                      >
                        <Power />
                        {accion === 'desactivar' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-muted-foreground">Sin acciones</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
