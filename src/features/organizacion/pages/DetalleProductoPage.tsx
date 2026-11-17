import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Eye, FileText, Link2, Pencil, Plus, Power, SlidersHorizontal, Trash2 } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { hasPermission, PERMISOS, usePermisos } from '@/features/auth'
import {
  type EstadoProducto,
  type ProductoAdmin,
  type SubProductoAdmin,
} from '@/features/organizacion/api/productos.contract'
import { EstadoProductoBadge } from '@/features/organizacion/components/EstadoProductoBadge'
import {
  ParametrosSubProductoDialog,
  VinculosProductoDialog,
} from '@/features/organizacion/components/ParametrosSubProductoDialog'
import { ProductoFormDialog, type ModoProducto } from '@/features/organizacion/components/ProductoFormDialog'
import { SubProductoFormDialog } from '@/features/organizacion/components/SubProductoFormDialog'
import {
  useActualizarProducto,
  useActualizarSubProducto,
  useEliminarProducto,
  useProductoAdmin,
} from '@/features/organizacion/hooks/useProductosAdmin'
import { condicionesDe, ETIQUETA_TIPO, mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

const AYUDA_PARAMETROS = {
  Credito: 'Cada subproducto personaliza sus tasas, comisiones, seguros y tablas de amortización.',
  Cuenta: 'Cada subproducto define sus cupos por canal, restricciones, tasas de ahorro y comisiones.',
  Tarjeta: 'Cada subproducto define sus cupos por canal, tasas de tarjeta y comisiones.',
} as const

/**
 * Un producto con sus subproductos. En productos de crédito cada subproducto se parametriza
 * (montos, plazos, tasas y tablas de amortización). ASESOR consulta; solo ADMIN cambia.
 */
export function DetalleProductoPage() {
  const { idProducto } = useParams()
  const producto = useProductoAdmin(Number(idProducto))

  const volver = (
    <Link to="/productos" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-heading">
      <ArrowLeft className="size-4" aria-hidden />
      Productos
    </Link>
  )

  if (producto.isError) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {volver}
        <Aviso tono="error">{mensajeErrorProducto(toApiError(producto.error))}</Aviso>
      </div>
    )
  }
  if (producto.isPending) return <Cargando texto="Cargando producto…" />
  return <Detalle producto={producto.data} volver={volver} />
}

function Detalle({ producto, volver }: { producto: ProductoAdmin; volver: ReactNode }) {
  const esAdmin = hasPermission(usePermisos(), PERMISOS.productosEditar)
  const actualizarProducto = useActualizarProducto()
  const actualizarSub = useActualizarSubProducto()
  const [formulario, setFormulario] = useState<ModoProducto | null>(null)
  const [nuevoSub, setNuevoSub] = useState(false)
  const [parametrizar, setParametrizar] = useState<SubProductoAdmin | null>(null)
  const [vinculos, setVinculos] = useState(false)
  const [porEliminar, setPorEliminar] = useState(false)
  const eliminar = useEliminarProducto()
  const navegar = useNavigate()

  const confirmarEliminar = () =>
    eliminar.mutate(producto.idProducto, {
      onSuccess: () => navegar('/productos'),
      onError: (e) => {
        setPorEliminar(false)
        setError(mensajeErrorProducto(toApiError(e)))
      },
    })
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ocupado = actualizarProducto.isPending || actualizarSub.isPending

  const alGuardar = (mensaje: string) => {
    setFormulario(null)
    setNuevoSub(false)
    setParametrizar(null)
    setError(null)
    setConfirmacion(mensaje)
  }

  const cambiarEstadoProducto = () => {
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {volver}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[36px] leading-tight font-bold tracking-tight text-heading">{producto.nombreProducto}</h1>
            <EstadoProductoBadge estado={producto.estado} estadoCatalogo={producto.estadoCatalogo} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {producto.codigoProducto} · {ETIQUETA_TIPO[producto.tipoProducto]} · {condicionesDe(producto)}
            {producto.permiteOperacionesPresenciales ? ' · en ventanilla' : ''}
          </p>
          <p className="mt-3 text-base text-heading">
            {producto.descripcion ?? <span className="text-muted-foreground">Sin descripción.</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setVinculos(true)}>
            <Link2 />
            Tasas y cargos
          </Button>
        {esAdmin ? (
          <>
            <Button variant="ghost" disabled={producto.estadoCatalogo !== 'Borrador'} onClick={() => setFormulario({ tipo: 'editar', producto })}>
              <Pencil />
              Editar
            </Button>
            <Button variant={producto.estado === 'A' ? 'destructive' : 'outline'} disabled={ocupado || producto.estadoCatalogo === 'Retirado'} onClick={cambiarEstadoProducto}>
              <Power />
              {producto.estado === 'A' ? 'Desactivar' : 'Activar'}
            </Button>
            {producto.estadoCatalogo === 'Borrador' &&
              (porEliminar ? (
                <>
                  <Button variant="destructive" disabled={eliminar.isPending} onClick={confirmarEliminar}>
                    Sí, eliminar
                  </Button>
                  <Button variant="ghost" onClick={() => setPorEliminar(false)}>
                    No
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setPorEliminar(true)} title="Solo si nunca se usó">
                  <Trash2 />
                  Eliminar
                </Button>
              ))}
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="size-4" aria-hidden />
            Solo consulta
          </p>
        )}
        </div>
      </header>

      {confirmacion && <Aviso>{confirmacion}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}

      <section aria-labelledby="titulo-subproductos" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="titulo-subproductos" className="text-lg font-semibold text-heading">Subproductos</h2>
            <p className="text-sm text-muted-foreground">{AYUDA_PARAMETROS[producto.tipoProducto]}</p>
          </div>
          {esAdmin && (
            <Button variant="outline" onClick={() => setNuevoSub(true)}>
              <Plus />
              Subproducto
            </Button>
          )}
        </div>

        {producto.subproductos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin subproductos. El producto se activa cuando tiene al menos uno.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Subproductos de {producto.nombreProducto}</caption>
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Código</th>
                  <th scope="col" className="px-3 py-2 font-medium">Nombre</th>
                  <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {producto.subproductos.map((sub) => (
                  <tr key={sub.idSubProducto} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-heading">{sub.codigoSubProducto}</td>
                    <td className="px-3 py-2 text-heading">
                      {sub.nombreSubProducto}
                      {sub.tipoTarjeta && (
                        <span className="ml-2 text-xs text-muted-foreground">({sub.tipoTarjeta === 'Debito' ? 'débito' : 'crédito'})</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><EstadoProductoBadge estado={sub.estado} estadoCatalogo={sub.estadoCatalogo} /></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/productos/subproductos/${sub.idSubProducto}/ficha`} aria-label={`Ficha de ${sub.codigoSubProducto}`}>
                            <FileText />
                            Ficha
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setParametrizar(sub)} aria-label={`Parámetros de ${sub.codigoSubProducto}`}>
                          <SlidersHorizontal />
                          Parámetros
                        </Button>
                        {esAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={ocupado || sub.estadoCatalogo === 'Retirado'}
                            onClick={() => cambiarEstadoSub(sub)}
                            aria-label={`${sub.estado === 'A' ? 'Desactivar' : 'Activar'} ${sub.codigoSubProducto}`}
                          >
                            <Power />
                            {sub.estado === 'A' ? 'Desactivar' : 'Activar'}
                          </Button>
                        )}
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <VinculosProductoDialog
        producto={producto}
        abierto={vinculos}
        soloLectura={!esAdmin}
        onCerrar={() => setVinculos(false)}
        onGuardado={(mensaje) => {
          setVinculos(false)
          alGuardar(mensaje)
        }}
      />
      <ParametrosSubProductoDialog
        producto={producto}
        subproducto={parametrizar}
        soloLectura={!esAdmin}
        onCerrar={() => setParametrizar(null)}
        onGuardado={alGuardar}
      />
      {esAdmin && (
        <>
          <ProductoFormDialog modo={formulario} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
          <SubProductoFormDialog producto={nuevoSub ? producto : null} onCerrar={() => setNuevoSub(false)} onGuardado={alGuardar} />
        </>
      )}
    </div>
  )
}
