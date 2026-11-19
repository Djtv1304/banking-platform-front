import { useState, type FormEvent } from 'react'
import { Aviso, Button, Checkbox, Input, Label } from '@/shared/ui'
import { GrillaCupos } from '@/features/organizacion/components/GrillaCupos'
import { centavos, validarGrilla, type ClaseConjunto, type EntradaCupoVigencia, type TipoRestriccionVigencia, type VigenciasProducto } from '@/features/organizacion/api/programacion.contract'
import type { CupoCanal } from '@/features/organizacion/api/productos.contract'

interface Props { clase: ClaseConjunto; fecha: string; vigencias: VigenciasProducto; canales: CupoCanal[]; ocupado: boolean; onEnviar: (datos: Record<string, unknown>) => void; onCerrar: () => void }
const CAMPOS_CONDICION = [{ campo: 'montoAperturaMinimo', nombre: 'Monto minimo de apertura (USD)' }, { campo: 'saldoMinimo', nombre: 'Saldo minimo (USD)' }, { campo: 'tasaInteresAnual', nombre: 'Tasa anual (%)' }, { campo: 'periodicidadInteres', nombre: 'Periodicidad de interes' }, { campo: 'costoMantenimiento', nombre: 'Mantenimiento (USD)' }, { campo: 'periodicidadCosto', nombre: 'Periodicidad de mantenimiento' }, { campo: 'mesesInactividad', nombre: 'Meses de inactividad' }] as const

function actuales(canales: CupoCanal[]): EntradaCupoVigencia[] {
  return canales.map(c => ({ idCanal: c.idCanal, codigoCanal: c.codigoCanal, nombreCanal: c.nombreCanal, habilitado: c.habilitado, cupoDiarioMaximo: c.cupoDiarioMaximo == null ? '' : String(c.cupoDiarioMaximo), cupoMensualMaximo: c.cupoMensualMaximo == null ? '' : String(c.cupoMensualMaximo), montoMaxTransaccion: c.montoMaxTransaccion == null ? '' : String(c.montoMaxTransaccion), maxTransaccionesDia: c.maxTransaccionesDia == null ? '' : String(c.maxTransaccionesDia) }))
}
function validarCondicion(datos: Record<string, string>) {
  const apertura = centavos(datos.montoAperturaMinimo), saldo = centavos(datos.saldoMinimo), mantenimiento = centavos(datos.costoMantenimiento)
  if (apertura === null || saldo === null || mantenimiento === null || saldo > apertura) return 'Revise los importes: el saldo minimo no puede superar el monto de apertura.'
  if (!/^(0|[1-9]\d{0,2})(\.\d{1,4})?$/.test(datos.tasaInteresAnual) || Number(datos.tasaInteresAnual) > 100) return 'La tasa anual debe estar entre 0 y 100, con hasta cuatro decimales.'
  if (datos.mesesInactividad && (!/^\d+$/.test(datos.mesesInactividad) || Number(datos.mesesInactividad) < 1 || Number(datos.mesesInactividad) > 32767)) return 'Ingrese de 1 a 32767 meses de inactividad.'
  return null
}
export function ProgramacionForm({ clase, fecha, vigencias, canales, ocupado, onEnviar, onCerrar }: Props) {
  const vigente = vigencias.condiciones.find(v => ['Vigente', 'Programada'].includes(v.estado) && v.vigenciaDesde <= fecha && (!v.vigenciaHasta || fecha <= v.vigenciaHasta))
  const [desde, setDesde] = useState(fecha), [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [condicion, setCondicion] = useState<Record<string, string>>({ montoAperturaMinimo: vigente?.montoAperturaMinimo ?? '', saldoMinimo: vigente?.saldoMinimo ?? '', tasaInteresAnual: vigente?.tasaInteresAnual ?? '0', periodicidadInteres: vigente?.periodicidadInteres ?? '', costoMantenimiento: vigente?.costoMantenimiento ?? '0', periodicidadCosto: vigente?.periodicidadCosto ?? '', mesesInactividad: vigente?.mesesInactividad == null ? '' : String(vigente.mesesInactividad) })
  const [aplica, setAplica] = useState(vigente?.aplicaACuentasExistentes ?? false)
  const [cupos, setCupos] = useState(() => actuales(canales))
  const [tipo, setTipo] = useState(vigencias.tiposRestriccion[0]?.codigo ?? '')
  const [restriccion, setRestriccion] = useState({ descripcion: '', dias: '', monto: '', cantidad: '' })
  const seleccion = vigencias.tiposRestriccion.find(t => t.codigo === tipo)
  const errorCupos = clase === 'cupos' ? validarGrilla(cupos) : null
  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(null)
    if (!desde || desde < fecha || (hasta && hasta < desde)) { setError('Revise las fechas: inicio desde hoy y fin igual o posterior.'); return }
    const fechas = { vigenciaDesde: desde, vigenciaHasta: hasta || null }
    if (clase === 'condiciones') {
      const fallo = validarCondicion(condicion)
      if (fallo) { setError(fallo); return }
      onEnviar({ ...fechas, ...condicion, periodicidadInteres: condicion.periodicidadInteres || null, periodicidadCosto: condicion.periodicidadCosto || null, mesesInactividad: condicion.mesesInactividad ? Number(condicion.mesesInactividad) : null, aplicaACuentasExistentes: aplica })
    } else if (clase === 'cupos') {
      const fallo = validarGrilla(cupos)
      if (fallo) { setError(fallo); return }
      onEnviar({ ...fechas, cupos: cupos.filter(c => c.habilitado).map(c => ({ idCanal: c.idCanal, cupoDiarioMaximo: c.cupoDiarioMaximo, cupoMensualMaximo: c.cupoMensualMaximo, montoMaxTransaccion: c.montoMaxTransaccion, maxTransaccionesDia: Number(c.maxTransaccionesDia) })) })
    } else {
      if (!seleccion || !restriccion.descripcion.trim() || !validarRestriccion(seleccion, restriccion)) { setError('Complete los campos del tipo de restriccion seleccionado.'); return }
      onEnviar({ ...fechas, tipoRestriccion: tipo, descripcion: restriccion.descripcion.trim(), dias: seleccion.usaDias ? Number(restriccion.dias) : null, monto: seleccion.usaMonto ? restriccion.monto : null, cantidad: seleccion.usaCantidad ? Number(restriccion.cantidad) : null })
    }
  }
  return <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
    <Aviso>Se enviara una solicitud. El conjunto vigente se conserva hasta que otra persona autorizada apruebe el cambio.</Aviso>
    <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm">Fecha de inicio<Input type="date" value={desde} min={fecha} onChange={e => setDesde(e.target.value)} /></label><label className="flex flex-col gap-2 text-sm">Fecha final (opcional)<Input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)} /></label></div>
    {clase === 'condiciones' && <><div className="grid gap-4 sm:grid-cols-2">{CAMPOS_CONDICION.map(c => <label key={c.campo} className="flex flex-col gap-2 text-sm">{c.nombre}<Input maxLength={c.campo.startsWith('periodicidad') ? 12 : 30} value={condicion[c.campo]} onChange={e => setCondicion(v => ({ ...v, [c.campo]: e.target.value }))} /></label>)}</div><div className="flex items-center gap-2"><Checkbox id="aplica-existentes" checked={aplica} onCheckedChange={v => setAplica(v === true)} /><Label htmlFor="aplica-existentes">Aplicar a cuentas existentes</Label></div></>}
    {clase === 'cupos' && <><p className="text-sm text-muted-foreground">Un canal sin cupo no permite operaciones. Desde la fecha de inicio se aplicara el menor entre el limite de la cuenta y este techo.</p><GrillaCupos filas={cupos} disabled={ocupado} onCambiar={(id, cambio) => setCupos(v => v.map(c => c.idCanal === id ? { ...c, ...cambio } : c))} /></>}
    {clase === 'restricciones' && <><label className="flex flex-col gap-2 text-sm">Tipo de restriccion<select aria-label="Tipo de restriccion" className="rounded-lg border border-border bg-field p-3" value={tipo} onChange={e => setTipo(e.target.value)}>{vigencias.tiposRestriccion.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}</select></label><label className="flex flex-col gap-2 text-sm">Descripcion<Input maxLength={250} value={restriccion.descripcion} onChange={e => setRestriccion(v => ({ ...v, descripcion: e.target.value }))} /></label>{[['dias', seleccion?.usaDias, 'Dias'], ['monto', seleccion?.usaMonto, 'Monto (USD)'], ['cantidad', seleccion?.usaCantidad, 'Cantidad']] .map(([campo, visible, nombre]) => visible && <label key={String(campo)} className="flex flex-col gap-2 text-sm">{nombre}<Input value={restriccion[campo as 'dias' | 'monto' | 'cantidad']} onChange={e => setRestriccion(v => ({ ...v, [String(campo)]: e.target.value }))} /></label>)}</>}
    {(error ?? errorCupos) && <Aviso tono="error">{error ?? errorCupos}</Aviso>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={ocupado} onClick={onCerrar}>Volver</Button><Button disabled={ocupado} type="submit">{ocupado ? 'Enviando...' : 'Enviar a aprobacion'}</Button></div>
  </form>
}
function validarRestriccion(tipo: TipoRestriccionVigencia, valores: { dias: string; monto: string; cantidad: string }) {
  if (tipo.usaMonto && (centavos(valores.monto) === null || centavos(valores.monto)! <= 0n)) return false
  return [['dias', tipo.usaDias], ['cantidad', tipo.usaCantidad]].every(([campo, aplica]) => !aplica || (/^\d+$/.test(valores[campo as 'dias' | 'cantidad']) && Number(valores[campo as 'dias' | 'cantidad']) >= 1 && Number(valores[campo as 'dias' | 'cantidad']) <= 32767))
}
