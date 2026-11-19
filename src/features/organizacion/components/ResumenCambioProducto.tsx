import { useQuery } from '@tanstack/react-query'
import type { DetalleSolicitud } from '@/features/aprobaciones/api/aprobaciones.contract'
import { obtenerCupos, obtenerFicha } from '@/features/organizacion/api/productos.api'
import { ComparadorCambios, mostrarValor, valoresIguales } from '@/shared/ui/comparador-cambios'

import { objeto, TIPOS_RESTRICCION as TIPOS, CAMPOS_CONDICION as CAMPOS, CAMPOS_CUPO, pascal, tipoCanonico } from '@/features/organizacion/lib/cambios-producto'

/** Solo datos de negocio del contenido congelado. No muestra planes internos. */
export function ResumenCambioProducto({ solicitud: s }: { solicitud: DetalleSolicitud }) {
  const id = Number(s.idObjetivo), propuesta = objeto(s.despues.propuesta), datos = objeto(propuesta.datos)
  const contexto = objeto(s.despues.subproducto)
  const ficha = useQuery({ queryKey: ['productos', 'ficha', id], queryFn: () => obtenerFicha(id), enabled: !contexto.nombre && Number.isSafeInteger(id) && id > 0, retry: false })
  const canales = useQuery({ queryKey: ['productos', 'cupos', id], queryFn: () => obtenerCupos(id), enabled: propuesta.clase === 'cupos' && Number.isSafeInteger(id) && id > 0, retry: false })
  const nombre = typeof contexto.nombre === 'string' ? contexto.nombre : ficha.data?.subproducto.nombreSubProducto ?? `modelo comercial #${id}`
  const producto = typeof contexto.producto === 'string' ? contexto.producto : ficha.data?.producto.nombreProducto
  const clase = propuesta.clase ?? s.despues.clase, accion = propuesta.accion
  const registros = Array.isArray(s.antes.registros) ? s.antes.registros.map(objeto) : []
  const desde = typeof datos.vigenciaDesde === 'string' ? datos.vigenciaDesde : null
  const anterior = registros.filter(r => ['Vigente', 'Programada', 'A'].includes(String(r.Estado ?? r.EstadoCupo)) && (clase !== 'restricciones' || tipoCanonico(r) === datos.tipoRestriccion) && (!desde || String(r.VigenciaDesde) <= desde) && (!r.VigenciaHasta || !desde || String(r.VigenciaHasta) >= desde)).sort((a,b) => String(b.VigenciaDesde).localeCompare(String(a.VigenciaDesde)))[0]
  const finalizada = registros.find(r => r.IdRestriccion === propuesta.id)
  const camposRestriccion = ['descripcion', 'dias', 'monto', 'cantidad']
  const tipo = TIPOS[String(datos.tipoRestriccion)] ?? 'Restriccion del modelo'
  const titulo = accion === 'cancelar' ? 'Cancelar una programacion futura' : accion === 'fin' ? 'Finalizar una restriccion' : clase === 'cupos' ? 'Cambiar los cupos por canal' : clase === 'restricciones' ? `Establecer: ${tipo.toLowerCase()}` : 'Cambiar las condiciones del modelo'
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5" aria-label="Cambio propuesto"><div><h2 className="text-xl font-semibold">{titulo}</h2><p className="mt-2">{nombre}{producto ? ` · ${producto}` : ''}</p></div>
    {accion === 'programar' && <p className="text-sm text-muted-foreground">Inicio: {mostrarValor(desde)}{datos.vigenciaHasta ? <>. Fecha final: {mostrarValor(datos.vigenciaHasta)}</> : '. Sin fecha final.'}</p>}
    {accion === 'cancelar' ? <><p>Se solicita cancelar la programacion que inicia el {mostrarValor(propuesta.inicio)}. Se conservaran las condiciones y los limites anteriores que correspondan.</p><ComparadorCambios antes={{ 'Estado de la programacion': 'Programada' }} despues={{ 'Estado de la programacion': 'Cancelada' }} /></> : accion === 'fin' ? <ComparadorCambios antes={{ vigenciaHasta: finalizada?.VigenciaHasta ?? null }} despues={{ vigenciaHasta: propuesta.hasta }} /> : clase === 'condiciones' ? <ComparadorCambios antes={Object.fromEntries(CAMPOS.map(c => [c, anterior?.[pascal(c)]]))} despues={Object.fromEntries(CAMPOS.map(c => [c, datos[c]]))} /> : clase === 'cupos' ? <CambiosCupos registros={registros} datos={datos} desde={desde} canales={canales.data ?? []} /> : <ComparadorCambios antes={Object.fromEntries(camposRestriccion.map(c => [c, anterior?.[pascal(c)] ?? null]))} despues={Object.fromEntries(camposRestriccion.map(c => [c, datos[c] ?? null]))} />}
    {s.estado === 'Pendiente' && <p className="text-sm text-muted-foreground">El cambio aun no se aplica. Requiere la aprobacion de otra persona autorizada.</p>}
  </section>
}

function CambiosCupos({ registros, datos, desde, canales }: { registros: Record<string, unknown>[]; datos: Record<string, unknown>; desde: string | null; canales: { idCanal: number; nombreCanal: string }[] }) {
  const anteriores = registros.filter(r => r.EstadoCupo === 'A' && (!desde || String(r.VigenciaDesde) <= desde) && (!r.VigenciaHasta || !desde || String(r.VigenciaHasta) >= desde))
  const propuestos = Array.isArray(datos.cupos) ? datos.cupos.map(objeto) : []
  const ids = [...new Set([...anteriores.map(r => Number(r.IdCanal)), ...propuestos.map(r => Number(r.idCanal))])]
  const cambios = ids.map(id => {
    const previo = anteriores.find(r => r.IdCanal === id), siguiente = propuestos.find(r => r.idCanal === id)
    const antes: Record<string, unknown> = { 'Canal habilitado': Boolean(previo), ...Object.fromEntries(CAMPOS_CUPO.map(c => [c, previo?.[pascal(c)] ?? null])) }
    const despues: Record<string, unknown> = { 'Canal habilitado': Boolean(siguiente), ...Object.fromEntries(CAMPOS_CUPO.map(c => [c, siguiente?.[c] ?? null])) }
    return { id, antes, despues }
  }).filter(({ antes, despues }) => Object.keys(antes).some(c => !valoresIguales(antes[c], despues[c], c)))
  if (!cambios.length) return <p className="text-sm text-muted-foreground">No hay limites modificados; se solicita una nueva vigencia.</p>
  return <div className="space-y-4">{cambios.map(c => <div key={c.id}><h3 className="mb-2 font-semibold">{canales.find(x => x.idCanal === c.id)?.nombreCanal ?? `Canal ${c.id}`}</h3><ComparadorCambios antes={c.antes} despues={c.despues} /></div>)}</div>
}
