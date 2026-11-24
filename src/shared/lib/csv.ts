/** Valor de una celda del CSV: los números van sin comillas; null y undefined quedan vacíos */
export type ValorCsv = string | number | null | undefined

export interface ColumnaCsv<T> {
  titulo: string
  valor: (fila: T) => ValorCsv
}

const SEPARADOR = ';'
const SALTO = '\r\n'
/** Caracteres con los que una hoja de cálculo interpreta el texto como fórmula (OWASP, CSV injection) */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/

function escaparTexto(texto: string): string {
  const seguro = INICIO_DE_FORMULA.test(texto) ? `'${texto}` : texto
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro
}

function celda(valor: ValorCsv): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : ''
  return escaparTexto(valor)
}

/**
 * Convierte filas en texto CSV listo para Excel en español: separador `;`, filas con `\r\n`, comillas cuando hace falta
 * y protección contra inyección de fórmulas (un texto que empieza por `=`, `+`, `-`, `@`, tabulador o retorno de carro
 * lleva un `'` delante). No añade el BOM: de eso se ocupa `descargarCsv`.
 */
export function aCsv<T>(columnas: readonly ColumnaCsv<T>[], filas: readonly T[]): string {
  const cabecera = columnas.map((columna) => escaparTexto(columna.titulo)).join(SEPARADOR)
  const cuerpo = filas.map((fila) => columnas.map((columna) => celda(columna.valor(fila))).join(SEPARADOR))
  return [cabecera, ...cuerpo].join(SALTO)
}

const BOM = '﻿'

/** Descarga el texto como archivo `.csv` en UTF-8 con BOM, para que Excel respete los acentos */
export function descargarCsv(nombreArchivo: string, texto: string): void {
  const blob = new Blob([BOM, texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  // Se revoca después: hacerlo en el mismo turno del click puede cortar la descarga en algunos navegadores
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
