import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Eye, Plus, Search } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import { PRODUCTOS_ROLES } from '@/features/organizacion/api/productos.contract'
import { EstadoProductoBadge } from '@/features/organizacion/components/EstadoProductoBadge'
import { ProductoFormDialog, type ModoProducto } from '@/features/organizacion/components/ProductoFormDialog'
import { useProductosAdmin } from '@/features/organizacion/hooks/useProductosAdmin'
import {
  condicionesDe,
  ETIQUETA_TIPO,
  filtrarProductos,
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

  const contenido = (() => {
    if (productos.isError) return <Aviso tono="error">{mensajeErrorProducto(toApiError(productos.error))}</Aviso>
    if (productos.isPending) return <Cargando texto="Cargando productos…" />
    if (productos.data.length === 0) return <Aviso>Todavía no hay productos registrados.</Aviso>
    const visibles = filtrarProductos(productos.data, busqueda)
    if (visibles.length === 0) return <Aviso>Ningún producto coincide con «{busqueda.trim()}».</Aviso>
    return (
      <ul className="flex flex-col divide-y divide-border">
        {visibles.map((producto) => (
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
                  {producto.codigoProducto} · {ETIQUETA_TIPO[producto.tipoProducto]} · {condicionesDe(producto)} ·{' '}
                  {producto.subproductos.length} subproducto{producto.subproductos.length === 1 ? '' : 's'}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
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
