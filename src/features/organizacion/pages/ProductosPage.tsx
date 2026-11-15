import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, Eye, Plus, Search } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import { PRODUCTOS_ROLES, type TipoProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { EstadoProductoBadge } from '@/features/organizacion/components/EstadoProductoBadge'
import { ProductoFormDialog, type ModoProducto } from '@/features/organizacion/components/ProductoFormDialog'
import { useProductosAdmin } from '@/features/organizacion/hooks/useProductosAdmin'
import {
  condicionesDe,
  agruparPorTipo,
  filtrarProductos,
  GRUPO_TIPO,
  mensajeErrorProducto,
  rutaProducto,
} from '@/features/organizacion/lib/producto-form'

/**
 * Listado de productos con buscador. Al abrir uno se ven sus subproductos y sus parámetros.
 * ADMIN y ASESOR consultan; solo ADMIN crea. El backend repite la regla en cada ruta.
 */
export function ProductosPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(roles ?? [], PRODUCTOS_ROLES.administrar)
  const productos = useProductosAdmin()
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState<ModoProducto | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  // Los grupos empiezan cerrados para no saturar la vista
  const [abiertos, setAbiertos] = useState<ReadonlySet<TipoProductoAdmin>>(new Set())
  const buscando = busqueda.trim() !== ''
  const alternarGrupo = (tipo: TipoProductoAdmin) =>
    setAbiertos((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(tipo)) nuevo.delete(tipo)
      else nuevo.add(tipo)
      return nuevo
    })

  const contenido = (() => {
    if (productos.isError) return <Aviso tono="error">{mensajeErrorProducto(toApiError(productos.error))}</Aviso>
    if (productos.isPending) return <Cargando texto="Cargando productos…" />
    if (productos.data.length === 0) return <Aviso>Todavía no hay productos registrados.</Aviso>
    const visibles = filtrarProductos(productos.data, busqueda)
    if (visibles.length === 0) return <Aviso>Ningún producto coincide con «{busqueda.trim()}».</Aviso>
    return (
      <div className="flex flex-col gap-6">
        {agruparPorTipo(visibles).map(({ tipo, productos: delGrupo }) => {
          // Con búsqueda se abren los grupos que tienen coincidencias
          const desplegado = buscando || abiertos.has(tipo)
          return (
          <section key={tipo} className="flex flex-col gap-1 rounded-2xl border border-border">
            <h2>
              <button
                type="button"
                aria-expanded={desplegado}
                aria-controls={`grupo-${tipo}`}
                onClick={() => alternarGrupo(tipo)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-muted/60"
              >
                <span className="text-base font-semibold text-heading">
                  {GRUPO_TIPO[tipo]} <span className="text-sm font-normal text-muted-foreground">({delGrupo.length})</span>
                </span>
                <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', desplegado && 'rotate-180')} aria-hidden />
              </button>
            </h2>
            {desplegado && (
            <ul id={`grupo-${tipo}`} className="flex flex-col divide-y divide-border px-1 pb-2">
              {delGrupo.map((producto) => (
                <li key={producto.idProducto}>
                  <Link
                    to={rutaProducto(producto.idProducto)}
                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-4 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-heading">{producto.nombreProducto}</span>
                        <EstadoProductoBadge estado={producto.estado} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {producto.codigoProducto} · {condicionesDe(producto)}
                      </p>
                      {producto.subproductos.length > 0 && (
                        <p className="mt-1 text-xs text-heading">
                          {producto.subproductos.map((s) => s.nombreSubProducto).join(' · ')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            )}
          </section>
          )
        })}
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Productos</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Productos que la cooperativa ofrece a sus clientes. Abre uno para ver y parametrizar sus subproductos.
          </p>
        </div>
        {esAdmin ? (
          <Button size="lg" onClick={() => setFormulario({ tipo: 'crear' })} className="rounded-lg px-4 font-semibold">
            <Plus />
            Nuevo producto
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="size-4" aria-hidden />
            Solo consulta
          </p>
        )}
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}

      <section aria-label="Productos" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre, tipo o subproducto"
            aria-label="Buscar productos"
            maxLength={100}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        {contenido}
      </section>

      {esAdmin && (
        <ProductoFormDialog
          modo={formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={(mensaje) => {
            setFormulario(null)
            setConfirmacion(mensaje)
          }}
        />
      )}
    </div>
  )
}
