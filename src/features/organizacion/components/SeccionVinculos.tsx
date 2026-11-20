import { useState, type ReactNode } from 'react'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Checkbox, Label } from '@/shared/ui'
import {
  ETIQUETA_TIPO_TASA,
  useComisiones,
  useSeguros,
  useSistemasAmortizacion,
  useTasasInteres,
} from '@/features/catalogos'
import type { DestinoVinculos, ProductoAdmin, Vinculos, VinculosVista } from '@/features/organizacion/api/productos.contract'
import { useGuardarVinculos, useVinculos } from '@/features/organizacion/hooks/useProductosAdmin'
import { dinero, mensajeErrorProducto, porcentaje } from '@/features/organizacion/lib/producto-form'
import { alternar, marcarComision, marcarSeguro, soloPropios, tasasPermitidas } from '@/features/organizacion/lib/vinculos'

interface SeccionVinculosProps {
  producto: ProductoAdmin
  destino: DestinoVinculos
  soloLectura: boolean
  onGuardado: (mensaje: string) => void
}

/**
 * Checklist de tasas, comisiones, seguros y tablas de amortización. En un subproducto, lo que
 * viene del producto aparece marcado y bloqueado («del producto»); las comisiones heredadas se
 * pueden exonerar solo para ese subproducto.
 */
export function SeccionVinculos(props: SeccionVinculosProps) {
  const vinculos = useVinculos(props.destino)
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div>
        <h3 className="text-base font-semibold text-heading">Tasas, comisiones y seguros</h3>
        <p className="text-sm text-muted-foreground">
          {props.destino.tipo === 'producto'
            ? 'Lo que marques aquí aplica a todos los subproductos.'
            : 'Personaliza este subproducto. Lo marcado en el producto ya aplica.'}{' '}
          Se crean en Productos y Catálogos › Catálogos.
        </p>
      </div>
      {vinculos.isError ? (
        <Aviso tono="error">{mensajeErrorProducto(toApiError(vinculos.error))}</Aviso>
      ) : vinculos.isPending ? (
        <Cargando texto="Cargando vínculos…" />
      ) : (
        <Formulario key={`${props.destino.tipo}-${props.destino.id}`} {...props} inicial={vinculos.data} />
      )}
    </section>
  )
}

function Grupo({ titulo, vacio, children }: { titulo: string; vacio: string | null; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-heading">{titulo}</legend>
      {vacio ? <p className="text-sm text-muted-foreground">{vacio}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </fieldset>
  )
}

function Fila({
  id,
  marcado,
  bloqueado,
  onCambio,
  titulo,
  detalle,
  extra,
}: {
  id: string
  marcado: boolean
  bloqueado: boolean
  onCambio: (marcado: boolean) => void
  titulo: ReactNode
  detalle: string
  extra?: ReactNode
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <Checkbox id={id} className="mt-0.5" disabled={bloqueado} checked={marcado} onCheckedChange={(v) => onCambio(v === true)} />
        <Label htmlFor={id} className="flex flex-col items-start gap-0.5 text-sm text-heading">
          <span className="font-semibold">{titulo}</span>
          <span className="text-xs font-normal text-muted-foreground">{detalle}</span>
        </Label>
      </div>
      {extra}
    </li>
  )
}

const DelProducto = () => <span className="ml-2 text-xs font-normal text-muted-foreground">(del producto)</span>

function Formulario({ producto, destino, soloLectura, onGuardado, inicial }: SeccionVinculosProps & { inicial: VinculosVista }) {
  const tasas = useTasasInteres()
  const comisiones = useComisiones()
  const seguros = useSeguros()
  const sistemas = useSistemasAmortizacion()
  const guardar = useGuardarVinculos(destino)
  const [v, setV] = useState<Vinculos>(() => soloPropios(inicial))
  const heredado = inicial.delProducto ?? null
  const esCredito = producto.tipoProducto === 'Credito'
  const permitidas = tasasPermitidas(producto, tasas.data)

  const fallos = [tasas, comisiones, seguros, ...(esCredito ? [sistemas] : [])].filter(q => q.isError)
  if (fallos.length) return <div className="space-y-3"><Aviso tono="error">No se cargaron todos los catalogos. {toApiError(fallos[0].error).message}</Aviso><Button type="button" variant="outline" onClick={() => { for (const q of fallos) void q.refetch() }}>Reintentar catalogos</Button></div>
  if (tasas.isPending || comisiones.isPending || seguros.isPending || (esCredito && sistemas.isPending)) return <Cargando texto="Cargando catálogos…" />

  const enviar = () => {
    if (soloLectura || guardar.isPending) return
    guardar.mutate(v, {
      onSuccess: () =>
        onGuardado(
          destino.tipo === 'producto'
            ? `Guardamos los vínculos de ${producto.codigoProducto}: aplican a todos sus subproductos.`
            : 'Guardamos los vínculos del subproducto.',
        ),
    })
  }

  return (
    <fieldset disabled={guardar.isPending} className="flex min-w-0 flex-col gap-5">
      <Grupo titulo="Tasas de interés" vacio={permitidas.length === 0 ? 'No hay tasas activas para este tipo de producto.' : null}>
        {permitidas.map((t) => {
          const delProducto = heredado?.tasasInteres.includes(t.idTasaInteres) ?? false
          const rango = `${dinero(t.montoMinimo)} a ${dinero(t.montoMaximo)}${t.plazoMaximoMeses ? ` · hasta ${t.plazoMaximoMeses} meses` : ''}`
          return (
            <Fila
              key={t.idTasaInteres}
              id={`vin-tasa-${t.idTasaInteres}`}
              marcado={delProducto || v.tasasInteres.includes(t.idTasaInteres)}
              bloqueado={soloLectura || delProducto}
              onCambio={(m) => setV((x) => ({ ...x, tasasInteres: alternar(x.tasasInteres, t.idTasaInteres, m) }))}
              titulo={
                <>
                  {porcentaje(t.tasaNominalAnual)} · {t.nombreTipoCredito ?? ETIQUETA_TIPO_TASA[t.tipoTasa]}
                  {delProducto && <DelProducto />}
                </>
              }
              detalle={`${rango} · desde ${t.vigenciaDesde}${t.vigente ? '' : ' (no vigente hoy)'}`}
            />
          )
        })}
      </Grupo>

      <Grupo titulo="Comisiones y recargos" vacio={comisiones.data.length === 0 ? 'No hay comisiones activas.' : null}>
        {comisiones.data.map((c) => {
          const delProducto = heredado?.comisiones.some((x) => x.idComision === c.idComision) ?? false
          const propia = v.comisiones.find((x) => x.idComision === c.idComision)
          const valor = c.tipoCalculo === 'Porcentaje' ? `${c.valor} %` : dinero(c.valor)
          return (
            <Fila
              key={c.idComision}
              id={`vin-com-${c.idComision}`}
              marcado={delProducto || (propia !== undefined && !propia.exonerado)}
              bloqueado={soloLectura || delProducto}
              onCambio={(m) => setV((x) => marcarComision(x, c.idComision, m))}
              titulo={
                <>
                  {c.codigoComision} · {valor}
                  {delProducto && <DelProducto />}
                </>
              }
              detalle={`${c.descripcion} · ${c.nombreCanal}`}
              extra={
                delProducto && (
                  <div className="ml-7 flex items-center gap-2">
                    <Checkbox
                      id={`vin-exo-${c.idComision}`}
                      disabled={soloLectura}
                      checked={propia?.exonerado === true}
                      onCheckedChange={(e) => setV((x) => marcarComision(x, c.idComision, e === true, true))}
                    />
                    <Label htmlFor={`vin-exo-${c.idComision}`} className="text-xs text-heading">
                      Exonerar en este subproducto
                    </Label>
                  </div>
                )
              }
            />
          )
        })}
      </Grupo>

      <Grupo titulo="Seguros" vacio={seguros.data.length === 0 ? 'No hay seguros activos.' : null}>
        {seguros.data.map((s) => {
          const delProducto = heredado?.seguros.find((x) => x.idSeguro === s.idSeguro)
          const propio = v.seguros.find((x) => x.idSeguro === s.idSeguro)
          const valor = s.tipoCalculo === 'Porcentaje' ? `${s.valor} %` : dinero(s.valor)
          return (
            <Fila
              key={s.idSeguro}
              id={`vin-seg-${s.idSeguro}`}
              marcado={delProducto !== undefined || propio !== undefined}
              bloqueado={soloLectura || delProducto !== undefined}
              onCambio={(m) => setV((x) => marcarSeguro(x, s.idSeguro, m))}
              titulo={
                <>
                  {s.nombre} · {valor}
                  {delProducto && <DelProducto />}
                </>
              }
              detalle={`${s.aseguradora ?? 'Sin aseguradora'}${(delProducto ?? propio)?.esObligatorio ? ' · obligatorio' : ''}`}
              extra={
                propio && (
                  <div className="ml-7 flex items-center gap-2">
                    <Checkbox
                      id={`vin-obl-${s.idSeguro}`}
                      disabled={soloLectura}
                      checked={propio.esObligatorio}
                      onCheckedChange={(o) => setV((x) => marcarSeguro(x, s.idSeguro, true, o === true))}
                    />
                    <Label htmlFor={`vin-obl-${s.idSeguro}`} className="text-xs text-heading">
                      Obligatorio
                    </Label>
                  </div>
                )
              }
            />
          )
        })}
      </Grupo>

      {esCredito && (
        <Grupo titulo="Tablas de amortización" vacio={sistemas.data.length === 0 ? 'No hay sistemas activos.' : null}>
          {sistemas.data.map((s) => {
            const delProducto = heredado?.sistemasAmortizacion.includes(s.codigo) ?? false
            return (
              <Fila
                key={s.codigo}
                id={`vin-sis-${s.codigo}`}
                marcado={delProducto || v.sistemasAmortizacion.includes(s.codigo)}
                bloqueado={soloLectura || delProducto}
                onCambio={(m) => setV((x) => ({ ...x, sistemasAmortizacion: alternar(x.sistemasAmortizacion, s.codigo, m) }))}
                titulo={
                  <>
                    {s.nombre}
                    {delProducto && <DelProducto />}
                  </>
                }
                detalle={s.descripcion}
              />
            )
          })}
        </Grupo>
      )}

      {guardar.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(guardar.error))}</Aviso>}
      {!soloLectura && (
        <div className="flex justify-end">
          <Button type="button" onClick={enviar} disabled={guardar.isPending} className="rounded-lg px-4 font-semibold">
            {guardar.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar vínculos
          </Button>
        </div>
      )}
    </fieldset>
  )
}
