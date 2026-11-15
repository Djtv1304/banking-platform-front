import type { CampoCatalogo, RegistroCatalogo, ValorCampo } from '@/features/catalogos/api/catalogos.contract'

/*
 * Edición genérica de una fila de catálogo. Cada campo se escribe como texto (los booleanos con
 * casilla) y se convierte según su tipo, con las mismas reglas que el backend. Los porcentajes se
 * escriben en % (16 = 16 %) y viajan como fracción (0.16).
 */

/** Sin caracteres de control: el texto termina en pantallas, reportes y la auditoría */
const sinControl = (valor: string) =>
  [...valor].every((caracter) => {
    const codigo = caracter.charCodeAt(0)
    return codigo > 0x1f && codigo !== 0x7f
  })
const DINERO = /^\d{1,16}(\.\d{1,2})?$/
const PORCIENTO = /^\d{1,3}(\.\d{1,2})?$/

export type Resultado = { valor: ValorCampo } | { error: string }

/** Valor de la fila → texto del formulario */
export function aTexto(campo: CampoCatalogo, valor: ValorCampo | undefined): string | boolean {
  if (campo.tipo === 'booleano') return valor === true
  if (valor == null) return ''
  if (campo.tipo === 'porcentaje') return String(Math.round(Number(valor) * 1000000) / 10000)
  return String(valor)
}

/** Texto del formulario → valor para el PATCH, o el error para mostrar */
export function leerCampo(campo: CampoCatalogo, entrada: string | boolean): Resultado {
  if (campo.tipo === 'booleano') return { valor: entrada === true }
  const texto = String(entrada).trim()
  if (texto === '') return campo.nulo ? { valor: null } : { error: 'Es obligatorio.' }
  switch (campo.tipo) {
    case 'texto':
      if (!sinControl(texto)) return { error: 'Escríbelo en una sola línea.' }
      if (campo.maximo && texto.length > campo.maximo) return { error: `Usa ${campo.maximo} caracteres como máximo.` }
      return { valor: texto }
    case 'entero': {
      if (!/^\d{1,4}$/.test(texto)) return { error: 'Usa un número entero.' }
      const n = Number(texto)
      if ((campo.minimo != null && n < campo.minimo) || (campo.maximo != null && n > campo.maximo)) {
        return { error: `Entre ${campo.minimo ?? 0} y ${campo.maximo ?? '∞'}.` }
      }
      return { valor: n }
    }
    case 'dinero': {
      if (!DINERO.test(texto)) return { error: 'Usa un monto como 500 o 500.50.' }
      const n = Number(texto)
      const minimo = campo.minimo ?? 0.01
      if (n < minimo) return { error: minimo === 0 ? 'No puede ser negativo.' : 'Debe ser mayor que 0.' }
      return { valor: n }
    }
    case 'porcentaje': {
      if (!PORCIENTO.test(texto)) return { error: 'Usa un porcentaje como 16 o 16.5.' }
      const n = Number(texto)
      if (n > 100 || (campo.nombre === 'tasaNominalAnual' && n === 0)) return { error: 'Entre 0.01 y 100 %.' }
      return { valor: Math.round(n * 100) / 10000 }
    }
    case 'fecha':
      return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? { valor: texto } : { error: 'Elige una fecha.' }
  }
}

/** Arma el body con solo lo que cambió; si algún campo es inválido devuelve los errores */
export function cambiosRegistro(
  campos: readonly CampoCatalogo[],
  registro: RegistroCatalogo,
  entradas: Record<string, string | boolean>,
): { body: Record<string, ValorCampo> } | { errores: Record<string, string> } {
  const body: Record<string, ValorCampo> = {}
  const errores: Record<string, string> = {}
  for (const campo of campos.filter((c) => c.editable)) {
    const resultado = leerCampo(campo, entradas[campo.nombre] ?? '')
    if ('error' in resultado) {
      errores[campo.nombre] = resultado.error
    } else if (resultado.valor !== (registro[campo.nombre] ?? null)) {
      body[campo.nombre] = resultado.valor
    }
  }
  return Object.keys(errores).length > 0 ? { errores } : { body }
}

const FORMATO_DINERO = { style: 'currency', currency: 'USD' } as const

/** Cómo se ve un valor en la tabla */
export function mostrar(campo: CampoCatalogo, valor: ValorCampo | undefined): string {
  if (campo.tipo === 'booleano') return valor ? 'Sí' : 'No'
  if (valor == null || valor === '') return '—'
  if (campo.tipo === 'dinero') return Number(valor).toLocaleString('es-EC', FORMATO_DINERO)
  if (campo.tipo === 'porcentaje') return `${(Number(valor) * 100).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`
  return String(valor)
}

/** Sin tildes ni mayúsculas, sobre todos los campos de la fila */
export function filtrarRegistros(registros: readonly RegistroCatalogo[], busqueda: string) {
  const normalizar = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const termino = normalizar(busqueda.trim())
  if (!termino) return [...registros]
  return registros.filter((r) => normalizar(Object.values(r).map((v) => String(v ?? '')).join(' ')).includes(termino))
}
