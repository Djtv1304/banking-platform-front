import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Eye, Pencil, Plus, Power, Search } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Badge, Button, Cargando, Input } from '@/shared/ui'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import {
  CATALOGOS_ROLES,
  type CatalogoAdministrable,
  type RegistroCatalogo,
} from '@/features/catalogos/api/catalogos.contract'
import { EditarRegistroDialog } from '@/features/catalogos/components/EditarRegistroDialog'
import { NuevaTasaDialog } from '@/features/catalogos/components/NuevaTasaDialog'
import {
  useActualizarRegistroCatalogo,
  useCatalogosAdministrables,
  useRegistrosCatalogo,
} from '@/features/catalogos/hooks/useCatalogos'
import { mensajeErrorCatalogo } from '@/features/catalogos/lib/mensajes'
import { filtrarRegistros, mostrar } from '@/features/catalogos/lib/registro-form'

/**
 * Todos los catálogos que se administran desde la app (sin agencias, productos ni plan de
 * cuentas, que tienen su propia pantalla). ADMIN edita y activa o desactiva; ASESOR consulta.
 * El catálogo elegido va en la URL (?catalogo=) para poder compartir el enlace.
 */
export function CatalogosPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(roles ?? [], CATALOGOS_ROLES.administrar)
  const catalogos = useCatalogosAdministrables()
  const [parametros, setParametros] = useSearchParams()
  const clave = parametros.get('catalogo') ?? catalogos.data[0]?.clave ?? null
  const catalogo = catalogos.data.find((c) => c.clave === clave) ?? null
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const elegir = (nueva: string) => {
    setConfirmacion(null)
    setParametros({ catalogo: nueva }, { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Catálogos</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Los datos que usan los productos y los formularios de la app. Nada se borra: se desactiva.
          </p>
        </div>
        {!esAdmin && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="size-4" aria-hidden />
            Solo consulta
          </p>
        )}
      </header>

      {catalogos.isError ? (
        <Aviso tono="error">{mensajeErrorCatalogo(toApiError(catalogos.error))}</Aviso>
      ) : catalogos.isPending ? (
        <Cargando texto="Cargando catálogos…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Catálogos" className="flex gap-2 overflow-x-auto lg:flex-col">
            {catalogos.data.map((c) => (
              <button
                key={c.clave}
                type="button"
                onClick={() => elegir(c.clave)}
                aria-current={c.clave === clave ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap',
                  c.clave === clave ? 'bg-primary/15 font-semibold text-heading' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {c.nombre}
              </button>
            ))}
          </nav>
          {confirmacion && (
            <div className="lg:col-start-2">
              <Aviso>{confirmacion}</Aviso>
            </div>
          )}
          {catalogo && (
            <TablaCatalogo
              key={catalogo.clave}
              catalogo={catalogo}
              esAdmin={esAdmin}
              onConfirmar={setConfirmacion}
            />
          )}
        </div>
      )}
    </div>
  )
}

function TablaCatalogo({
  catalogo,
  esAdmin,
  onConfirmar,
}: {
  catalogo: CatalogoAdministrable
  esAdmin: boolean
  onConfirmar: (mensaje: string | null) => void
}) {
  const registros = useRegistrosCatalogo(catalogo.clave)
  const actualizar = useActualizarRegistroCatalogo()
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<RegistroCatalogo | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiarEstado = (registro: RegistroCatalogo) => {
    const estado = registro.estado === 'A' ? 'I' : 'A'
    onConfirmar(null)
    setError(null)
    actualizar.mutate(
      { clave: catalogo.clave, id: registro.id, body: { estado } },
      {
        onSuccess: () => onConfirmar(estado === 'A' ? 'Activamos el registro.' : 'Desactivamos el registro: ya no se ofrece en los formularios.'),
        onError: (e) => setError(mensajeErrorCatalogo(toApiError(e))),
      },
    )
  }

  const guardado = (mensaje: string) => {
    setEditando(null)
    setCreando(false)
    onConfirmar(mensaje)
  }

  const contenido = (() => {
    if (registros.isError) return <Aviso tono="error">{mensajeErrorCatalogo(toApiError(registros.error))}</Aviso>
    if (registros.isPending) return <Cargando texto="Cargando registros…" />
    if (registros.data.length === 0) return <Aviso>Este catálogo no tiene registros.</Aviso>
    const visibles = filtrarRegistros(registros.data, busqueda)
    if (visibles.length === 0) return <Aviso>Ningún registro coincide con «{busqueda.trim()}».</Aviso>
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{catalogo.nombre}</caption>
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              {catalogo.campos.map((c) => (
                <th key={c.nombre} scope="col" className="px-3 py-2 font-medium">
                  {c.etiqueta}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 font-medium">Estado</th>
              {esAdmin && <th scope="col" className="px-3 py-2 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                {catalogo.campos.map((c) => (
                  <td key={c.nombre} className="px-3 py-2 text-heading">
                    {mostrar(c, r[c.nombre])}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Badge className={cn('h-6 px-2.5', r.estado === 'A' ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground')}>
                    {r.estado === 'A' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                {esAdmin && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditando(r)} aria-label={`Editar registro ${r.id}`}>
                      <Pencil />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actualizar.isPending}
                      onClick={() => cambiarEstado(r)}
                      aria-label={`${r.estado === 'A' ? 'Desactivar' : 'Activar'} registro ${r.id}`}
                    >
                      <Power />
                      {r.estado === 'A' ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  })()

  return (
    <section aria-labelledby="titulo-catalogo" className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:p-8 lg:col-start-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-catalogo" className="text-lg font-semibold text-heading">{catalogo.nombre}</h2>
          <p className="text-sm text-muted-foreground">{catalogo.descripcion}</p>
        </div>
        {esAdmin && catalogo.permiteCrear && (
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Nueva tasa
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar en ${catalogo.nombre.toLowerCase()}`}
          aria-label={`Buscar en ${catalogo.nombre}`}
          maxLength={100}
          className="h-11 rounded-xl pl-9"
        />
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
      {contenido}
      {esAdmin && (
        <>
          <EditarRegistroDialog catalogo={catalogo} registro={editando} onCerrar={() => setEditando(null)} onGuardado={guardado} />
          {catalogo.permiteCrear && <NuevaTasaDialog abierto={creando} onCerrar={() => setCreando(false)} onGuardado={guardado} />}
        </>
      )}
    </section>
  )
}
