/**
 * Montos en dólares escritos como en Ecuador: coma decimal y punto de miles («1.234,56»).
 *
 * Se trabaja en centavos enteros para que las sumas no arrastren el error de la coma flotante.
 * Un punto solo, seguido de uno o dos dígitos, se toma como decimal («12.50» = 12,50) porque así
 * escribe mucha gente; con tres dígitos detrás es de miles («1.234» = 1234).
 */

/** Dígitos enteros admitidos: el tipo money de SQL Server llega a 922 billones; 13 sobra */
export const MONTO_MAX_ENTEROS = 13

const FORMATO = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const FORMATO_DOLARES = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

/** Miles bien agrupados: «1.234.567»; sin puntos también vale */
const milesValidos = (entero: string) => !entero.includes('.') || /^\d{1,3}(\.\d{3})+$/.test(entero)

/** Deja sólo lo que puede formar un monto: dígitos, punto y coma */
export const soloCaracteresDeMonto = (texto: string) => texto.replace(/[^\d.,]/g, '')

/**
 * Centavos del texto, o `null` si el texto está vacío o no es un monto válido
 * (más de dos decimales, miles mal agrupados, más de una coma o demasiados dígitos).
 */
export function centavosDeTexto(texto: string): number | null {
  const limpio = texto.replace(/[\s$]/g, '')
  if (!/^[\d.,]+$/.test(limpio)) return null

  let entero: string
  let decimales = ''
  const porComa = limpio.split(',')
  if (porComa.length > 2) return null
  if (porComa.length === 2) {
    ;[entero, decimales] = porComa
    if (!milesValidos(entero)) return null
  } else {
    const porPunto = limpio.split('.')
    if (porPunto.length === 2 && porPunto[1].length <= 2) {
      ;[entero, decimales] = porPunto
    } else {
      entero = limpio
      if (!milesValidos(entero)) return null
    }
  }

  entero = entero.replaceAll('.', '')
  if (entero === '' && decimales === '') return null
  if (!/^\d*$/.test(entero) || !/^\d{0,2}$/.test(decimales)) return null
  if (entero.replace(/^0+/, '').length > MONTO_MAX_ENTEROS) return null
  return Number(entero || '0') * 100 + Number(decimales.padEnd(2, '0'))
}

/** «1.234,50» (sin símbolo): lo que se deja escrito en el campo al salir */
export const formatearCentavos = (centavos: number) => FORMATO.format(centavos / 100)

/** «$1.234,50»: para totales y diferencias */
export const formatearDolares = (centavos: number) => FORMATO_DOLARES.format(centavos / 100)

/** Lo que viaja al backend: dólares con dos decimales como número */
export const dolaresDeCentavos = (centavos: number) => centavos / 100
