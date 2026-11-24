import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, AvisoRequiereAprobacion, Button, Cargando } from '@/shared/ui'
import { hasPermission, PERMISOS, usePermisos } from '@/features/auth'
import type { AsignacionCuenta, CambioAsignacion, ClaseCuenta } from '@/features/contabilidad/api/cuentas-producto.contract'
import { AsignarCuentaDialog, type Asignando, type OpcionAlcance } from '@/features/contabilidad/components/AsignarCuentaDialog'
import { useAsignacionesTipo, useClasesCuenta, useSolicitarAsignaciones } from '@/features/contabilidad/hooks/useCuentasProducto'
import { usePlanCuentas } from '@/features/contabilidad/hooks/usePlanCuentas'
import { construirArbol } from '@/features/contabilidad/lib/arbol'
import {
  asignacionVigente,
  descripcionClase,
  excepciones,
  grupoClase,
  hoyEcuador,
  mensajeCuentasProducto,
  pestanas,
  type Pestana,
} from '@/features/contabilidad/lib/cuentas-producto'

interface Pendiente {
  cambio: CambioAsignacion
  resumen: string
}

const Cuenta = ({ a }: { a?: AsignacionCuenta }) =>
  a ? (
    <span>
      <span className="font-mono">{a.codigoCuenta}</span> · {a.nombreCuenta}
    </span>
  ) : (
    <span className="font-semibold text-destructive">Sin cuenta</span>
  )

/** E3-05 · Cuentas contables de cada tipo de producto: se asignan una vez y las heredan sus productos */
export function CuentasProductoPage() {
  const puedeEditar = hasPermission(usePermisos(), PERMISOS.cuentasProductoEditar)
  const puedeCrearCuenta = hasPermission(usePermisos(), PERMISOS.contabilidadEditar)
  const clases = useClasesCuenta()
  const plan = usePlanCuentas()
  const arbol = useMemo(() => construirArbol(plan.data ?? []), [plan.data])
  const lista = useMemo(() => pestanas(clases.data ?? []), [clases.data])

  const [claveActiva, setClaveActiva] = useState<string | null>(null)
  const activa: Pestana | undefined = lista.find((p) => p.clave === claveActiva) ?? lista[0]
  const datos = useAsignacionesTipo(activa?.idTipoProducto ?? null)
  const solicitar = useSolicitarAsignaciones(activa?.idTipoProducto ?? 0)

  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [asignando, setAsignando] = useState<Asignando | null>(null)
  const [resultado, setResultado] = useState<{ tono?: 'error'; texto: string } | null>(null)

  if (clases.isError) return <Aviso tono="error">{toApiError(clases.error).message}</Aviso>
  if (clases.isPending || !activa) return <Cargando texto="Cargando las cuentas de los productos…" />

  const hoy = hoyEcuador()
  const delTipo = (clases.data ?? []).filter((k) => k.idTipoProducto === activa.idTipoProducto && k.idTipoCredito === activa.idTipoCredito)
  const porTipo = delTipo.filter((k) => k.nivel === 'TIPO')
  const porProducto = delTipo.filter((k) => k.nivel === 'PRODUCTO')
  const asignaciones = datos.data?.asignaciones ?? []
  const productos = (datos.data?.productos ?? []).filter((p) => activa.idTipoCredito === null || p.idTipoCredito === activa.idTipoCredito)
  const subproductos = (datos.data?.subproductos ?? []).filter((s) => productos.some((p) => p.idProducto === s.idProducto))
  const grupos = [...new Set(porTipo.map(grupoClase))]

  const opciones = (clase: ClaseCuenta): OpcionAlcance[] => [
    ...(clase.nivel === 'TIPO' ? [{ clave: 'tipo', etiqueta: `Todo el tipo (${activa.etiqueta})`, alcance: { nivel: 'TIPO' as const } }] : []),
    ...productos.map((p) => ({ clave: `p${p.idProducto}`, etiqueta: `Producto ${p.codigoProducto} · ${p.nombreProducto}`, alcance: { nivel: 'PRODUCTO' as const, id: p.idProducto } })),
    ...subproductos.map((s) => ({ clave: `s${s.idSubProducto}`, etiqueta: `Subproducto ${s.codigoSubProducto} · ${s.nombreSubProducto}`, alcance: { nivel: 'SUBPRODUCTO' as const, id: s.idSubProducto } })),
  ]
  const abrir = (clase: ClaseCuenta, inicial: string) => {
    setResultado(null)
    setAsignando({ clase, opciones: opciones(clase), inicial })
  }
  const cambiarPestana = (clave: string) => {
    setClaveActiva(clave)
    setPendientes([])
    setResultado(null)
  }
  const enviar = () =>
    solicitar.mutate(
      pendientes.map((p) => p.cambio),
      {
        onSuccess: ({ idSolicitud }) => {
          setPendientes([])
          setResultado({ texto: `Solicitud #${idSolicitud} enviada a aprobación: los cambios rigen cuando otra persona la apruebe.` })
        },
        onError: (error) => {
          const e = toApiError(error)
          setResultado({ tono: 'error', texto: mensajeCuentasProducto(e.code, e.message) })
        },
      },
    )

  const nombreClase = (idClase: number) => {
    const k = delTipo.find((c) => c.idClase === idClase)
    return k ? descripcionClase(k) : `Rol ${idClase}`
  }
  const accion = (clase: ClaseCuenta, inicial: string) =>
    puedeEditar && (
      <Button size="sm" variant="outline" onClick={() => abrir(clase, inicial)}>
        Cambiar
      </Button>
    )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Cuentas por producto</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Cada rol contable se asigna una vez por tipo de producto (el capital de los depósitos, por producto) y lo heredan sus
          subproductos: crear un subproducto no crea cuentas. Una cuenta propia de un producto o subproducto es una excepción.
          {!puedeEditar && ' Tienes acceso de solo consulta.'}
        </p>
      </header>

      <nav aria-label="Tipos de producto" className="flex flex-wrap gap-2">
        {lista.map((p) => (
          <Button key={p.clave} variant={p.clave === activa.clave ? 'default' : 'outline'} aria-pressed={p.clave === activa.clave} onClick={() => cambiarPestana(p.clave)}>
            {p.etiqueta}
          </Button>
        ))}
      </nav>

      {datos.data?.solicitudPendiente && <AvisoRequiereAprobacion idSolicitud={datos.data.solicitudPendiente} />}
      {resultado && <Aviso tono={resultado.tono}>{resultado.texto}</Aviso>}
      {datos.isError && <Aviso tono="error">{toApiError(datos.error).message}</Aviso>}
      {datos.isPending && <Cargando texto="Cargando asignaciones…" />}

      {pendientes.length > 0 && (
        <section aria-label="Cambios por enviar" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-heading">Cambios por enviar ({pendientes.length})</h2>
          <ul className="flex flex-col gap-2 text-sm text-heading">
            {pendientes.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span>{p.resumen}</span>
                <Button size="sm" variant="ghost" aria-label="Quitar de la solicitud" onClick={() => setPendientes(pendientes.filter((_, j) => j !== i))}>
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button className="w-fit" disabled={solicitar.isPending || Boolean(datos.data?.solicitudPendiente)} onClick={enviar}>
            Enviar a aprobación
          </Button>
        </section>
      )}

      {datos.data && porProducto.length > 0 && (
        <section aria-label="Capital por producto" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-heading">Capital por producto</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="py-2">Producto</th><th>Cuenta</th><th>Rige desde</th><th /></tr>
            </thead>
            <tbody>
              {porProducto.flatMap((k) =>
                productos.map((p) => {
                  const a = asignacionVigente(asignaciones, k.idClase, { nivel: 'PRODUCTO', id: p.idProducto }, hoy)
                  return (
                    <tr key={`${k.idClase}-${p.idProducto}`} className="border-t border-border">
                      <td className="py-2">{p.codigoProducto} · {p.nombreProducto}</td>
                      <td><Cuenta a={a} /></td>
                      <td>{a?.vigenciaDesde ?? '—'}</td>
                      <td className="text-right">{accion(k, `p${p.idProducto}`)}</td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </section>
      )}

      {datos.data &&
        grupos.map((grupo) => (
          <section key={grupo} aria-label={grupo} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-heading">{grupo}</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr><th className="py-2">Rol</th><th>Cuenta del tipo</th><th>Rige desde</th><th /></tr>
              </thead>
              <tbody>
                {porTipo
                  .filter((k) => grupoClase(k) === grupo)
                  .map((k) => {
                    const a = asignacionVigente(asignaciones, k.idClase, { nivel: 'TIPO' }, hoy)
                    return (
                      <tr key={k.idClase} className="border-t border-border">
                        <td className="py-2">
                          {k.codigoRol === 'CARTERA' && k.nombreCuentaBase ? k.nombreCuentaBase : descripcionClase(k)}
                          {k.soloConTasa && <span className="text-muted-foreground"> · si la tasa es mayor que 0</span>}
                        </td>
                        <td><Cuenta a={a} /></td>
                        <td>{a?.vigenciaDesde ?? '—'}</td>
                        <td className="text-right">{accion(k, 'tipo')}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </section>
        ))}

      {datos.data && (
        <section aria-label="Excepciones" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-heading">Excepciones y programadas</h2>
          {(() => {
            const filas = [
              ...excepciones(asignaciones, delTipo),
              ...asignaciones.filter((a) => a.vigenciaDesde > hoy && delTipo.some((k) => k.idClase === a.idClase)),
            ].filter((a, i, todas) => todas.findIndex((b) => b.idCuentaProducto === a.idCuentaProducto) === i)
            if (filas.length === 0) return <p className="text-sm text-muted-foreground">Ningún producto o subproducto tiene una cuenta propia.</p>
            return (
              <ul className="flex flex-col gap-1 text-sm text-heading">
                {filas.map((a) => (
                  <li key={a.idCuentaProducto}>
                    {nombreClase(a.idClase)} · {a.codigoSubProducto ?? a.codigoProducto ?? 'todo el tipo'}: <Cuenta a={a} /> desde {a.vigenciaDesde}
                    {a.vigenciaHasta ? ` hasta ${a.vigenciaHasta}` : ''}
                  </li>
                ))}
              </ul>
            )
          })()}
        </section>
      )}

      {puedeEditar && (
        <AsignarCuentaDialog
          asignando={asignando}
          plan={plan.data ?? []}
          arbol={arbol}
          puedeCrearCuenta={puedeCrearCuenta}
          onCerrar={() => setAsignando(null)}
          onAgregar={(cambio, resumen) => {
            const llave = (c: CambioAsignacion) => `${c.idClase}-${c.idProducto ?? ''}-${c.idSubProducto ?? ''}`
            setPendientes([...pendientes.filter((p) => llave(p.cambio) !== llave(cambio)), { cambio, resumen }])
            setAsignando(null)
          }}
        />
      )}
    </div>
  )
}
