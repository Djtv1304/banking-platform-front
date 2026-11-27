import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { hasPermission, PERMISOS, usePermisos } from '@/features/auth'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { ETIQUETA_TIPO_TASA, type TipoTasa } from '@/features/catalogos'
import { CuentasSubproducto } from '@/features/contabilidad'
import { useFichaSubProducto, useImprimirFicha } from '@/features/organizacion/hooks/useProductosAdmin'
import { dinero, ETIQUETA_TIPO, mensajeErrorProducto, porcentaje, rutaProducto } from '@/features/organizacion/lib/producto-form'
import { PestanaHistorial } from '@/features/auditoria'

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
  const imprimir = useImprimirFicha(Number(idSubProducto))
  const puedeImprimir = hasPermission(usePermisos(), PERMISOS.productosExportar)

  if (ficha.isError) return <Aviso tono="error">{mensajeErrorProducto(toApiError(ficha.error))}</Aviso>
  if (ficha.isPending) return <Cargando texto="Cargando ficha…" />
  const { producto, condiciones, fecha, subproducto: sub, elegibilidad: e, cupos, restricciones, tasas, comisiones, seguros, sistemasAmortizacion } = ficha.data
  const edad =
    e.edadMinima == null && e.edadMaxima == null
      ? 'Sin límite de edad'
      : `${e.edadMinima ?? 0} a ${e.edadMaxima ?? 'sin máximo'} años`
  // De dónde sale la edad mínima que rige (la más alta)
  const origen = [
    e.edadMinimaSubproducto != null && `subproducto ${e.edadMinimaSubproducto}`,
    e.edadMinimaRed != null && `red ${e.edadMinimaRed}`,
    e.edadMinimaPolitica != null && `política de crédito ${e.edadMinimaPolitica}`,
  ].filter(Boolean)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 print:max-w-none print:bg-white print:[&_*]:text-black print:[&_*]:bg-white">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to={rutaProducto(producto.idProducto)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-heading">
          <ArrowLeft className="size-4" aria-hidden />
          {producto.nombreProducto}
        </Link>
        {puedeImprimir && <Button variant="outline" disabled={imprimir.isPending} onClick={() => imprimir.mutate()}>
          <Printer />
          Imprimir
        </Button>}
      </div>
      {imprimir.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(imprimir.error))}</Aviso>}
      <header>
        <p className="text-sm text-muted-foreground">
          {ETIQUETA_TIPO[producto.tipoProducto]} · {producto.nombreProducto}
        </p>
        <h1 className="text-[32px] leading-tight font-bold text-heading">{sub.nombreSubProducto}</h1>
        <p className="text-sm text-muted-foreground">
          {sub.codigoSubProducto} · {sub.estadoCatalogo ?? (sub.estado === 'A' ? 'Activo' : 'Suspendido')} · {edad}
          {origen.length > 0 && ` (mínima: ${origen.join(', ')})`}
        </p>
        {producto.descripcion && <p className="mt-2 text-base text-heading">{producto.descripcion}</p>}
      </header>

      <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
        <Bloque titulo={`Condiciones vigentes${fecha ? ` al ${fecha}` : ''}`} vacio={!condiciones}>
          {condiciones && <>
            <li>Apertura: {dinero(condiciones.montoAperturaMinimo)}</li>
            <li>Saldo mínimo: {dinero(condiciones.saldoMinimo)}</li>
            <li>Interés anual: {condiciones.tasaInteresAnual} % {condiciones.periodicidadInteres}</li>
            <li>Mantenimiento: {dinero(condiciones.costoMantenimiento)} {condiciones.periodicidadCosto}</li>
            {condiciones.mesesInactividad != null && <li>Inactividad: {condiciones.mesesInactividad} meses</li>}
            <li>Vigencia: {condiciones.vigenciaDesde} a {condiciones.vigenciaHasta ?? 'sin fecha final'}</li>
          </>}
        </Bloque>
        <Bloque titulo="Elegibilidad" vacio={false}>
          <li>Tipo de cliente: {e.tipoClientePermitido ?? 'Ambos'}</li>
          <li>Edad: {edad}</li>
          <li>{e.requiereTutor ? 'Requiere tutor verificable' : 'No requiere tutor'}</li>
          {e.idSubProductoRequerido != null && <li>Subproducto requerido: {e.idSubProductoRequerido}</li>}
          {e.maximoPorCliente != null && <li>Máximo por cliente: {e.maximoPorCliente}</li>}
        </Bloque>
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
        <CuentasSubproducto idSubProducto={sub.idSubProducto} />
        <PestanaHistorial tipo="ProductosFinancieros.SubProducto" id={sub.idSubProducto} />
      </div>
    </div>
  )
}
