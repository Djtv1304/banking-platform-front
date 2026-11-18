import type { EntradaValor, Parametro } from '@/features/parametros/api/parametros.contract'

export function hoyEcuador() {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(p => p.type === tipo)?.value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}
function escala(valor: string): bigint {
  const signo = valor.startsWith('-') ? -1n : 1n
  const [entero, decimal = ''] = valor.replace(/^-/, '').split('.')
  return signo * (BigInt(entero) * 10_000n + BigInt(decimal.padEnd(4, '0')))
}
export function validarValor(p: Pick<Parametro, 'tipoDato' | 'minimo' | 'maximo'>, entrada: EntradaValor, hoy = hoyEcuador()): string | null {
  if (entrada.vigenciaDesde < hoy) return 'La fecha no puede ser anterior a hoy.'
  const v = entrada.valor
  const numerico = p.tipoDato === 'Entero' || p.tipoDato === 'Decimal'
  if (numerico) {
    const formato = p.tipoDato === 'Entero' ? /^-?(0|[1-9]\d*)$/ : /^-?(0|[1-9]\d*)(\.\d{1,4})?$/
    if (!formato.test(v)) return 'Ingrese un numero valido para el tipo; hasta cuatro decimales.'
    if ((p.minimo !== null && escala(v) < escala(p.minimo)) || (p.maximo !== null && escala(v) > escala(p.maximo))) return 'El valor esta fuera del rango permitido.'
  }
  if (p.tipoDato === 'Booleano' && v !== 'true' && v !== 'false') return 'Seleccione verdadero o falso.'
  if (p.tipoDato === 'Hora' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return 'Ingrese una hora HH:MM valida.'
  if (p.tipoDato === 'Lista') {
    try { const lista: unknown = JSON.parse(v); if (!Array.isArray(lista) || !lista.every(x => typeof x === 'string')) return 'Ingrese una lista JSON de textos.' }
    catch { return 'Ingrese una lista JSON de textos.' }
  }
  return null
}
