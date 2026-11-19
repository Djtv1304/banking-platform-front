import type { VigenciasProducto } from '@/features/organizacion/api/programacion.contract'
import type { DetalleSolicitud } from '@/features/aprobaciones/api/aprobaciones.contract'
import { valoresIguales } from '@/shared/ui/comparador-cambios'

export const TIPOS_RESTRICCION: Record<string, string> = { SIN_RETIROS: 'Sin retiros', SIN_RETIROS_DIAS: 'Sin retiros durante los primeros dias', SALDO_MINIMO: 'Saldo minimo', SALDO_MAXIMO: 'Saldo maximo', MAXIMO_CUENTAS_CLIENTE: 'Maximo de cuentas por cliente', SIN_TRANSFERENCIAS_SALIDA: 'Sin transferencias de salida' }
export const CAMPOS_CONDICION = ['montoAperturaMinimo', 'saldoMinimo', 'tasaInteresAnual', 'periodicidadInteres', 'costoMantenimiento', 'periodicidadCosto', 'mesesInactividad', 'aplicaACuentasExistentes']
export const CAMPOS_CUPO = ['cupoDiarioMaximo', 'cupoMensualMaximo', 'montoMaxTransaccion', 'maxTransaccionesDia']
export function objeto(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {} }
export const pascal = (c: string) => c[0].toUpperCase() + c.slice(1)
export function leer(f: Record<string, unknown>, c: string): unknown { return c in f ? f[c] : f[pascal(c)] }
export function tipoCanonico(f: Record<string, unknown>) { return leer(f, 'tipoRestriccion') === 'SIN_RETIROS' && leer(f, 'dias') != null ? 'SIN_RETIROS_DIAS' : String(leer(f, 'tipoRestriccion')) }
export const ETIQUETAS: Record<string, string> = { montoAperturaMinimo: 'Monto minimo de apertura (USD)', saldoMinimo: 'Saldo minimo requerido (USD)', tasaInteresAnual: 'Tasa de interes anual (%)', periodicidadInteres: 'Periodicidad del interes', costoMantenimiento: 'Costo de mantenimiento (USD)', periodicidadCosto: 'Periodicidad del mantenimiento', mesesInactividad: 'Periodo de inactividad (meses)', aplicaACuentasExistentes: 'Aplica a cuentas existentes', cupoDiarioMaximo: 'Limite diario (USD)', cupoMensualMaximo: 'Limite mensual (USD)', montoMaxTransaccion: 'Monto maximo por transaccion (USD)', maxTransaccionesDia: 'Numero maximo de transacciones por dia', descripcion: 'Descripcion', dias: 'Dias de restriccion desde la apertura', monto: 'Monto de la restriccion (USD)', cantidad: 'Cantidad permitida', vigenciaDesde: 'Inicio de vigencia', vigenciaHasta: 'Fin de vigencia', habilitado: 'Canal habilitado' }
export interface FichaValores { titulo: string; valores: Record<string, unknown> }
export interface ComparacionProducto { antes: FichaValores[]; despues: FichaValores[]; cambios: { campo: string; etiqueta: string; valor: unknown; grupo: string }[]; titulo: string }
function ficha(f: Record<string, unknown>, clase: string, canal: (id: number) => string): FichaValores {
  const tipo = tipoCanonico(f)
  const claves = clase === 'condiciones' ? CAMPOS_CONDICION : clase === 'cupos' ? CAMPOS_CUPO : ['descripcion', ...(tipo === 'SIN_RETIROS_DIAS' ? ['dias'] : []), ...(['SALDO_MINIMO', 'SALDO_MAXIMO'].includes(tipo) ? ['monto'] : []), ...(tipo === 'MAXIMO_CUENTAS_CLIENTE' ? ['cantidad'] : [])]
  return { titulo: clase === 'cupos' ? canal(Number(leer(f, 'idCanal'))) : clase === 'restricciones' ? TIPOS_RESTRICCION[tipo] ?? 'Restriccion' : 'Condiciones del modelo', valores: Object.fromEntries([...claves, 'vigenciaDesde', 'vigenciaHasta'].map(c => [c, leer(f, c)])) }
}

/** Usa unicamente los snapshots congelados: la ficha actual no representa el pasado. */
export function compararProducto(s: DetalleSolicitud, canales: { idCanal: number; nombreCanal: string }[] = []): ComparacionProducto {
  const p = objeto(s.despues.propuesta), datos = objeto(p.datos), clase = String(p.clase ?? s.despues.clase)
  const registros = Array.isArray(s.antes.registros) ? s.antes.registros.map(objeto) : []
  const canal = (id: number) => canales.find(c => c.idCanal === id)?.nombreCanal ?? `Canal ${id}`
  const desde = typeof datos.vigenciaDesde === 'string' ? datos.vigenciaDesde : null
  const nombres: Record<string, string> = { condiciones: 'las condiciones', cupos: 'los limites por canal', restricciones: 'las restricciones' }
  let antes: FichaValores[], despues: FichaValores[]
  if (p.accion === 'cancelar') {
    const llave = clase === 'condiciones' ? 'IdCondicion' : clase === 'cupos' ? 'IdProductoCanalCupo' : 'IdRestriccion'
    const ids = Array.isArray(p.ids) ? p.ids : []
    antes = registros.filter(r => ids.includes(r[llave])).map(r => ficha(r, clase, canal))
    const restaurar = Array.isArray(p._restaurar) ? p._restaurar.map(objeto) : []
    despues = restaurar.flatMap(v => { const r = registros.find(r => r[llave] === v.id); return r ? [ficha({ ...r, VigenciaHasta: v.hasta }, clase, canal)] : [] })
    return { antes, despues, cambios: [], titulo: `Se cancelo una programacion futura de ${nombres[clase] ?? 'la configuracion'}` }
  }
  if (p.accion === 'fin') {
    const r = registros.find(r => r.IdRestriccion === p.id)
    antes = r ? [ficha(r, clase, canal)] : []
    despues = r ? [ficha({ ...r, VigenciaHasta: p.hasta }, clase, canal)] : []
  } else {
    const previos = registros.filter(r => ['Vigente', 'Programada', 'A'].includes(String(r.Estado ?? r.EstadoCupo)) && (!desde || String(r.VigenciaDesde) <= desde) && (!r.VigenciaHasta || !desde || String(r.VigenciaHasta) >= desde) && (clase !== 'restricciones' || tipoCanonico(r) === datos.tipoRestriccion)).sort((a, b) => String(b.VigenciaDesde).localeCompare(String(a.VigenciaDesde)))
    antes = (clase === 'cupos' ? previos : previos.slice(0, 1)).map(r => ficha(r, clase, canal))
    despues = clase === 'cupos' ? (Array.isArray(datos.cupos) ? datos.cupos.map(objeto) : []).map(c => ficha({ ...c, vigenciaDesde: datos.vigenciaDesde, vigenciaHasta: datos.vigenciaHasta ?? null }, clase, canal)) : [ficha(datos, clase, canal)]
  }
  const cambios: ComparacionProducto['cambios'] = []
  for (const grupo of [...new Set([...antes.map(v => v.titulo), ...despues.map(v => v.titulo)])]) {
    const previo = antes.find(v => v.titulo === grupo), siguiente = despues.find(v => v.titulo === grupo)
    if (clase === 'cupos' && (!previo || !siguiente)) cambios.push({ campo: 'habilitado', etiqueta: siguiente ? 'Canal habilitado' : 'Canal deshabilitado', valor: Boolean(siguiente), grupo })
    for (const campo of [...new Set([...Object.keys(previo?.valores ?? {}), ...Object.keys(siguiente?.valores ?? {})])]) {
      if (!valoresIguales(previo?.valores[campo], siguiente?.valores[campo], campo)) cambios.push({ campo, etiqueta: ETIQUETAS[campo] ?? campo, valor: siguiente?.valores[campo], grupo })
    }
  }
  const valores = cambios.filter(c => !['vigenciaDesde', 'vigenciaHasta'].includes(c.campo))
  return { antes, despues, cambios: valores.length ? valores : cambios, titulo: p.accion === 'fin' ? 'Se programo el fin de una restriccion' : `Se actualizaron ${nombres[clase] ?? 'los valores'}` }
}


export interface FiltrosHistorial { desde: string; hasta: string; usuario: string }
export function filtrarSolicitudes(solicitudes: VigenciasProducto['solicitudes'], filtros: FiltrosHistorial) {
  const normalizar = (v: string) => v.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
  const usuario = normalizar(filtros.usuario)
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) return []
  return solicitudes.filter(s => {
    if (usuario) {
      const id = s.responsable.match(/\((\d+)\)\s*$/)?.[1]
      if (/^[0-9]+$/.test(usuario) ? id !== usuario.replace(/^0+(?=\d)/, '') : !usuario.split(/\s+/).every(v => normalizar(s.responsable).includes(v))) return false
    }
    if (!filtros.desde && !filtros.hasta) return true
    const instante = new Date(s.fecha)
    if (Number.isNaN(instante.valueOf())) return false
    const partes = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Guayaquil' }).formatToParts(instante)
    const fecha = ['year', 'month', 'day'].map(c => partes.find(p => p.type === c)?.value).join('-')
    return (!filtros.desde || fecha >= filtros.desde) && (!filtros.hasta || fecha <= filtros.hasta)
  })
}
