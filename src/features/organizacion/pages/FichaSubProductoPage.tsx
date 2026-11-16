import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { ETIQUETA_TIPO_TASA, type TipoTasa } from '@/features/catalogos'
import { useFichaSubProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import { condicionesDe, dinero, ETIQUETA_TIPO, mensajeErrorProducto, porcentaje, rutaProducto } from '@/features/organizacion/lib/producto-form'

const delProducto = (heredado: boolean) => (heredado ? ' · del producto' : '')

function Bloque({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid">
      <h2 className="text-base font-semibold text-heading">{titulo}</h2>
      {vacio ? <p className="text-sm text-muted-foreground">Sin definir.</p> : <ul className="flex flex-col gap-1 text-sm text-heading">{children}</ul>}
    </section>
  )
}

/** Ficha imprimible del subproducto: lo que el asesor lee al cliente (E3-02) */
export function FichaSubProductoPage() {
  const { idSubProducto } = useParams()
  const ficha = useFichaSubProducto(Number(idSubProducto))

  if (ficha.isError) return <Aviso tono="error">{mensajeErrorProducto(toApiError(ficha.error))}</Aviso>
  if (ficha.isPending) return <Cargando texto="Cargando ficha…" />
  const { producto, subproducto: sub, cupos, restricciones, tasas, comisiones, seguros, sistemasAmortizacion } = ficha.data
  const edad =
    sub.edadMinima == null && sub.edadMaxima == null
      ? 'Sin límite de edad'
      : `${sub.edadMinima ?? 0} a ${sub.edadMaxima ?? 'sin máximo'} años`

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to={rutaProducto(producto.idProducto)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-heading">
          <ArrowLeft className="size-4" aria-hidden />
          {producto.nombreProducto}
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Imprimir
        </Button>
      </div>
      <header>
        <p className="text-sm text-muted-foreground">
          {ETIQUETA_TIPO[producto.tipoProducto]} · {producto.nombreProducto} · {condicionesDe(producto)}
        </p>
        <h1 className="text-[32px] leading-tight font-bold text-heading">{sub.nombreSubProducto}</h1>
        <p className="text-sm text-muted-foreground">
          {sub.codigoSubProducto} · {sub.estado === 'A' ? 'Activo' : 'Inactivo'} · {edad}
        </p>
        {producto.descripcion && <p className="mt-2 text-base text-heading">{producto.descripcion}</p>}
      </header>

      <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
        <Bloque titulo="Tasas de interés" vacio={tasas.length === 0}>
          {tasas.map((t) => (
            <li key={t.idTasaInteres}>
              {porcentaje(t.tasaNominalAnual)} · {ETIQUETA_TIPO_TASA[t.tipoTasa as TipoTasa] ?? t.tipoTasa} · {dinero(t.montoMinimo)} a {dinero(t.montoMaximo)}
              {t.plazoMaximoMeses ? ` · hasta ${t.plazoMaximoMeses} meses` : ''}
              {delProducto(t.delProducto)}
            </li>
          ))}
        </Bloque>
        <Bloque titulo="Comisiones y recargos" vacio={comisiones.length === 0}>
          {comisiones.map((c) => (
            <li key={c.idComision}>
              {c.descripcion} · {c.tipoCalculo === 'Porcentaje' ? `${c.valor} %` : dinero(c.valor)} · {c.nombreCanal}
              {delProducto(c.delProducto)}
            </li>
          ))}
        </Bloque>
        <Bloque titulo="Seguros" vacio={seguros.length === 0}>
          {seguros.map((s) => (
            <li key={s.idSeguro}>
              {s.nombre} · {s.tipoCalculo === 'Porcentaje' ? `${s.valor} %` : dinero(s.valor)}
              {s.esObligatorio ? ' · obligatorio' : ''}
              {delProducto(s.delProducto)}
            </li>
          ))}
        </Bloque>
        {producto.tipoProducto === 'Credito' ? (
          <Bloque titulo="Tablas de amortización" vacio={sistemasAmortizacion.length === 0}>
            {sistemasAmortizacion.map((s) => (
              <li key={s}>{s === 'FRANCES' ? 'Francés (cuota fija)' : s === 'ALEMAN' ? 'Alemán (capital fijo)' : s}</li>
            ))}
          </Bloque>
        ) : (
          <Bloque titulo="Cupos por canal" vacio={cupos.length === 0}>
            {cupos.map((c) => (
              <li key={c.idCanal}>
                {c.nombreCanal}: {dinero(c.cupoDiarioMaximo)} al día, {dinero(c.cupoMensualMaximo)} al mes, hasta {dinero(c.montoMaxTransaccion)} por
                transacción y {c.maxTransaccionesDia} por día
              </li>
            ))}
          </Bloque>
        )}
        {restricciones && (
          <Bloque titulo="Restricciones" vacio={restricciones.saldoMinimo == null && restricciones.diasSinRetiros == null}>
            {restricciones.saldoMinimo != null && <li>Saldo mínimo de {dinero(restricciones.saldoMinimo)}</li>}
            {restricciones.diasSinRetiros != null && <li>Sin retiros durante {restricciones.diasSinRetiros} días desde la apertura</li>}
          </Bloque>
        )}
      </div>
    </div>
  )
}
