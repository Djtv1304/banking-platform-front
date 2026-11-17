import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, Eye, Plus, Search } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'
import { hasPermission, PERMISOS, usePermisos } from '@/features/auth'
import { EstadoProductoBadge } from '@/features/organizacion/components/EstadoProductoBadge'
import { ProductoFormDialog, type ModoProducto } from '@/features/organizacion/components/ProductoFormDialog'
import { useProductosAdmin, useTiposProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import {
  jerarquiaComercial,
  filtrarProductos,
  mensajeErrorProducto,
  rutaProducto,
} from '@/features/organizacion/lib/producto-form'

/**
 * Listado de productos con buscador. Al abrir uno se ven sus subproductos y sus parámetros.
 * ADMIN y ASESOR consultan; solo ADMIN crea. El backend repite la regla en cada ruta.
 */
export function ProductosPage() {
  const esAdmin = hasPermission(usePermisos(), PERMISOS.productosEditar)
  const productos = useProductosAdmin()
  const tipos = useTiposProducto()
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [formulario, setFormulario] = useState<ModoProducto | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  // Los grupos empiezan cerrados para no saturar la vista
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())
  const buscando = busqueda.trim() !== ''
  const alternarGrupo = (tipo: string) =>
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
    const familias = jerarquiaComercial(filtrarProductos(productos.data, busqueda), tipos.data, estadoFiltro)
    if (familias.length === 0) return <Aviso>No hay modelos que coincidan con los filtros.</Aviso>
    return (
      <div className="flex flex-col gap-6">
        {familias.map((familia) => {
          const desplegado = buscando || abiertos.has(familia.tipo)
          return (
            <section key={familia.tipo} className="rounded-2xl border border-border">
              <h2>
                <button type="button" aria-expanded={desplegado} aria-controls={`grupo-${familia.tipo}`} onClick={() => alternarGrupo(familia.tipo)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-muted/60">
                  <span className="text-base font-semibold text-heading">{familia.nombre}</span>
                  <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', desplegado && 'rotate-180')} aria-hidden />
                </button>
              </h2>
              {desplegado && <div id={`grupo-${familia.tipo}`} className="space-y-5 px-4 pb-4">
                {familia.subproductos.map((grupo) => <section key={grupo.clave} aria-label={grupo.nombre}>
                  <h3 className="mb-2 text-base font-semibold text-heading">{grupo.nombre} <span className="text-sm font-normal text-muted-foreground">({grupo.modelos.length})</span></h3>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {grupo.modelos.map(({ producto, subproducto }) => <li key={subproducto ? `sub-${subproducto.idSubProducto}` : `producto-${producto.idProducto}`} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-heading">{subproducto?.nombreSubProducto ?? producto.nombreProducto}</span>
                          <EstadoProductoBadge estado={subproducto?.estado ?? producto.estado} estadoCatalogo={subproducto ? subproducto.estadoCatalogo : producto.estadoCatalogo} />
                        </div>
                        <p className="text-xs text-muted-foreground">{subproducto?.codigoSubProducto ?? producto.codigoProducto} - {producto.nombreProducto}</p>
                        <p className="text-xs text-muted-foreground">{subproducto ? 'Consulta las condiciones y elegibilidad en la ficha.' : 'Sin modelos comerciales; completa el borrador.'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {subproducto && <Link to={`/productos/subproductos/${subproducto.idSubProducto}/ficha`} className="rounded-lg p-2 text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Ficha</Link>}
                        <Link to={rutaProducto(producto.idProducto)} aria-label={`Configurar ${subproducto?.codigoSubProducto ?? producto.codigoProducto}`} className="flex items-center gap-1 rounded-lg p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Configuracion <ChevronRight className="size-4" aria-hidden /></Link>
                      </div>
                    </li>)}
                  </ul>
                </section>)}
              </div>}
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
            Cuentas, creditos y tarjetas. Abre un producto y su subproducto para consultar los modelos comerciales.
          </p>
        </div>
        {esAdmin ? (
          <Button size="lg" onClick={() => setFormulario({ tipo: 'crear' })} className="rounded-lg px-4 font-semibold">
            <Plus />
            Nuevo modelo comercial
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
            placeholder="Buscar por codigo, nombre, subproducto o modelo"
            aria-label="Buscar productos"
            maxLength={100}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <label className="flex items-center gap-3 text-sm">Estado
          <select className="rounded-lg border border-border bg-card p-2" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            {['todos', 'Borrador', 'Activo', 'Suspendido', 'Retirado'].map((e) => <option key={e} value={e}>{e === 'todos' ? 'Todos' : e}</option>)}
          </select>
        </label>
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
