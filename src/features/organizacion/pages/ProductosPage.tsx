import { useState } from 'react'
import { Eye, Pencil, Plus, Power } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Badge, Button, Cargando } from '@/shared/ui'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import {
  PRODUCTOS_ROLES,
  type EstadoProducto,
  type ProductoAdmin,
  type SubProductoAdmin,
} from '@/features/organizacion/api/productos.contract'
import { ProductoFormDialog, type ModoProducto } from '@/features/organizacion/components/ProductoFormDialog'
import { SubProductoFormDialog } from '@/features/organizacion/components/SubProductoFormDialog'
import {
  useActualizarProducto,
  useActualizarSubProducto,
  useProductosAdmin,
} from '@/features/organizacion/hooks/useProductosAdmin'
import { condicionesDe, ETIQUETA_TIPO, mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

function EstadoBadge({ estado }: { estado: EstadoProducto }) {
  return (
    <Badge className={cn('h-6 px-2.5', estado === 'A' ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground')}>
      {estado === 'A' ? 'Activo' : 'Inactivo'}
    </Badge>
  )
}

/**
 * Productos y subproductos que ofrece la cooperativa. ADMIN y ASESOR los consultan; solo ADMIN
 * crea, edita y activa o desactiva. El backend repite la regla en cada ruta.
 */
export function ProductosPage() {
  const roles = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(roles ?? [], PRODUCTOS_ROLES.administrar)
  const productos = useProductosAdmin()
  const actualizarProducto = useActualizarProducto()
  const actualizarSub = useActualizarSubProducto()
  const [formulario, setFormulario] = useState<ModoProducto | null>(null)
  const [paraSubproducto, setParaSubproducto] = useState<ProductoAdmin | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const alGuardar = (mensaje: string) => {
    setFormulario(null)
    setParaSubproducto(null)
    setError(null)
    setConfirmacion(mensaje)
  }

  const cambiarEstadoProducto = (producto: ProductoAdmin) => {
    const estado: EstadoProducto = producto.estado === 'A' ? 'I' : 'A'
    setConfirmacion(null)
    setError(null)
    actualizarProducto.mutate(
      { idProducto: producto.idProducto, body: { estado } },
      {
        onSuccess: (p) =>
          setConfirmacion(
            estado === 'A'
              ? `Activamos ${p.codigoProducto}: ya se puede ofrecer.`
              : `Desactivamos ${p.codigoProducto}: no se ofrece más; lo que ya existe sigue operando.`,
          ),
        onError: (e) => setError(mensajeErrorProducto(toApiError(e))),
      },
    )
  }

  const cambiarEstadoSub = (sub: SubProductoAdmin) => {
    const estado: EstadoProducto = sub.estado === 'A' ? 'I' : 'A'
    setConfirmacion(null)
    setError(null)
    actualizarSub.mutate(
      { idSubProducto: sub.idSubProducto, body: { estado } },
      {
        onSuccess: (s) => setConfirmacion(`${estado === 'A' ? 'Activamos' : 'Desactivamos'} el subproducto ${s.codigoSubProducto}.`),
        onError: (e) => setError(mensajeErrorProducto(toApiError(e))),
      },
    )
  }

  const ocupado = actualizarProducto.isPending || actualizarSub.isPending

  const contenido = (() => {
    if (productos.isError) return <Aviso tono="error">{mensajeErrorProducto(toApiError(productos.error))}</Aviso>
    if (productos.isPending) return <Cargando texto="Cargando productos…" />
    if (productos.data.length === 0) return <Aviso>Todavía no hay productos registrados.</Aviso>
    return (
      <ul className="flex flex-col gap-4">
        {productos.data.map((producto) => (
          <li key={producto.idProducto} className="rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-heading">{producto.nombreProducto}</h2>
                  <EstadoBadge estado={producto.estado} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {producto.codigoProducto} · {ETIQUETA_TIPO[producto.tipoProducto]} · {condicionesDe(producto)}
                  {producto.permiteOperacionesPresenciales ? ' · en ventanilla' : ''}
                </p>
                <p className="mt-2 text-sm text-heading">
                  {producto.descripcion ?? <span className="text-muted-foreground">Sin descripción.</span>}
                </p>
              </div>
              {esAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFormulario({ tipo: 'editar', producto })} aria-label={`Editar ${producto.codigoProducto}`}>
                    <Pencil />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setParaSubproducto(producto)} aria-label={`Agregar subproducto a ${producto.codigoProducto}`}>
                    <Plus />
                    Subproducto
                  </Button>
                  <Button
                    variant={producto.estado === 'A' ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={ocupado}
                    onClick={() => cambiarEstadoProducto(producto)}
                    aria-label={`${producto.estado === 'A' ? 'Desactivar' : 'Activar'} ${producto.codigoProducto}`}
                  >
                    <Power />
                    {producto.estado === 'A' ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              {producto.subproductos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin subproductos.</p>
              ) : (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <caption className="sr-only">Subproductos de {producto.nombreProducto}</caption>
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Código</th>
                      <th scope="col" className="px-3 py-2 font-medium">Nombre</th>
                      <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                      {esAdmin && <th scope="col" className="px-3 py-2 text-right font-medium">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {producto.subproductos.map((sub) => (
                      <tr key={sub.idSubProducto} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium text-heading">{sub.codigoSubProducto}</td>
                        <td className="px-3 py-2 text-heading">
                          {sub.nombreSubProducto}
                          {sub.tipoTarjeta && <span className="ml-2 text-xs text-muted-foreground">({sub.tipoTarjeta === 'Debito' ? 'débito' : 'crédito'})</span>}
                        </td>
                        <td className="px-3 py-2"><EstadoBadge estado={sub.estado} /></td>
                        {esAdmin && (
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={ocupado}
                              onClick={() => cambiarEstadoSub(sub)}
                              aria-label={`${sub.estado === 'A' ? 'Desactivar' : 'Activar'} ${sub.codigoSubProducto}`}
                            >
                              <Power />
                              {sub.estado === 'A' ? 'Desactivar' : 'Activar'}
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
            Productos y subproductos que la cooperativa ofrece a sus clientes, con su descripción y condiciones.
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
      {error && <Aviso tono="error">{error}</Aviso>}

      <section aria-label="Productos" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {contenido}
      </section>

      {esAdmin && (
        <>
          <ProductoFormDialog modo={formulario} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
          <SubProductoFormDialog producto={paraSubproducto} onCerrar={() => setParaSubproducto(null)} onGuardado={alGuardar} />
        </>
      )}
    </div>
  )
}
