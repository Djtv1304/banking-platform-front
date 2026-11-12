import { useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { useAgencias, type Agencia } from '@/features/catalogos'
import { AgenciaFormDialog, type ModoAgencia } from '@/features/organizacion/components/AgenciaFormDialog'
import { CambiarEstadoAgenciaDialog, type CambioEstado } from '@/features/organizacion/components/CambiarEstadoAgenciaDialog'
import { EstadoAgenciaBadge } from '@/features/organizacion/components/EstadoAgenciaBadge'
import { accionEstado } from '@/features/organizacion/lib/agencias'

/** ORG-01/ORG-02 · Administración de agencias (solo ADMIN). La lista es el catálogo CAT-06 */
export function AgenciasPage() {
  const agencias = useAgencias()
  const [formulario, setFormulario] = useState<ModoAgencia | null>(null)
  const [cambio, setCambio] = useState<CambioEstado | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const abrirFormulario = (modo: ModoAgencia) => {
    setConfirmacion(null)
    setFormulario(modo)
  }

  const abrirCambio = (nuevo: CambioEstado) => {
    setConfirmacion(null)
    setCambio(nuevo)
  }

  const alGuardar = (mensaje: string) => {
    setFormulario(null)
    setCambio(null)
    setConfirmacion(mensaje)
  }

  const contenido = (() => {
    if (agencias.isError) return <Aviso tono="error">{toApiError(agencias.error).message}</Aviso>
    if (agencias.isPending) return <Cargando texto="Cargando agencias…" />
    if (agencias.data.length === 0) return <Aviso>Todavía no hay agencias registradas.</Aviso>
    return (
      <TablaAgencias
        agencias={agencias.data}
        onEditar={(agencia) => abrirFormulario({ tipo: 'editar', agencia })}
        onCambiarEstado={abrirCambio}
      />
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Agencias</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Matriz y sucursales de la cooperativa. Crea agencias, corrige sus datos o cambia su estado.
          </p>
        </div>
        <Button size="lg" onClick={() => abrirFormulario({ tipo: 'crear' })} className="rounded-lg px-4 font-semibold">
          <Plus />
          Nueva agencia
        </Button>
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}

      <section aria-label="Agencias" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {contenido}
      </section>

      <AgenciaFormDialog modo={formulario} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      <CambiarEstadoAgenciaDialog cambio={cambio} onCerrar={() => setCambio(null)} onGuardado={alGuardar} />
    </div>
  )
}

interface TablaAgenciasProps {
  agencias: Agencia[]
  onEditar: (agencia: Agencia) => void
  onCambiarEstado: (cambio: CambioEstado) => void
}

function TablaAgencias({ agencias, onEditar, onCambiarEstado }: TablaAgenciasProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
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
            return (
              <tr key={agencia.idAgencia} className="border-b border-border">
                <td className="px-3 py-3">
                  <span className="block font-semibold text-heading">{agencia.codigo}</span>
                  <span className="text-xs text-muted-foreground">ID {agencia.idAgencia}</span>
                </td>
                <td className="px-3 py-3 text-heading">{agencia.tipoAgencia}</td>
                <td className="px-3 py-3">
                  <span className="block text-heading">{agencia.ciudad}</span>
                  <span className="text-xs text-muted-foreground">{agencia.provincia}</span>
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
