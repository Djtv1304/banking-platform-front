import type { TipoIdentificacion } from '@/features/clientes/api/clientes.contract'

/** Códigos de provincia válidos en Ecuador: 01–24 y 30 (ecuatorianos registrados en el exterior) */
function provinciaValida(codigo: number) {
  return (codigo >= 1 && codigo <= 24) || codigo === 30
}

/** Cédula ecuatoriana: 10 dígitos, provincia válida, tercer dígito < 6 y dígito verificador (módulo 10). */
export function esCedulaValida(cedula: string) {
  if (!/^\d{10}$/.test(cedula)) return false
  if (!provinciaValida(Number(cedula.slice(0, 2))) || Number(cedula[2]) >= 6) return false

  const suma = [...cedula.slice(0, 9)].reduce((total, digito, index) => {
    const producto = Number(digito) * (index % 2 === 0 ? 2 : 1)
    return total + (producto > 9 ? producto - 9 : producto)
  }, 0)
  const verificador = (10 - (suma % 10)) % 10
  return verificador === Number(cedula[9])
}

/**
 * RUC: 13 dígitos y establecimiento distinto de 000. Para personas naturales (tercer dígito < 6)
 * los 10 primeros dígitos deben ser una cédula válida. Para sociedades (6 y 9) solo se valida
 * estructura y provincia: su dígito verificador tiene excepciones y lo confirma el backend.
 */
export function esRucValido(ruc: string) {
  if (!/^\d{13}$/.test(ruc) || ruc.endsWith('000')) return false
  if (!provinciaValida(Number(ruc.slice(0, 2)))) return false

  const tercerDigito = Number(ruc[2])
  if (tercerDigito < 6) return esCedulaValida(ruc.slice(0, 10))
  return tercerDigito === 6 || tercerDigito === 9
}

/** Pasaporte: entre 5 y 20 letras o números (el formato varía por país emisor) */
export function esPasaporteValido(pasaporte: string) {
  return /^[A-Z0-9]{5,20}$/i.test(pasaporte)
}

/** Deja solo letras y números en mayúsculas (quita espacios, guiones y puntos al pegar) */
export function normalizarIdentificacion(valor: string) {
  return valor.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

/**
 * Deduce el tipo de documento a partir de lo que se escribe (ya normalizado):
 * - con letras → pasaporte (la cédula y el RUC son solo dígitos);
 * - hasta 10 dígitos → cédula; de 11 a 13 → RUC; más de 13 → pasaporte.
 * Un pasaporte solo con dígitos de 10 o 13 se confundiría con cédula o RUC: para ese caso la
 * vista ofrece "Buscar como pasaporte" en lugar de adivinar.
 * Es solo una ayuda de interfaz: el backend vuelve a validar el documento.
 */
export function detectarTipoIdentificacion(valor: string, comoPasaporte = false): TipoIdentificacion | null {
  if (!valor) return null
  if (comoPasaporte || /[A-Z]/.test(valor) || valor.length > 13) return 'PASAPORTE'
  return valor.length <= 10 ? 'CEDULA' : 'RUC'
}

const VALIDADORES: Record<TipoIdentificacion, (valor: string) => boolean> = {
  CEDULA: esCedulaValida,
  RUC: esRucValido,
  PASAPORTE: esPasaporteValido,
}

export const esIdentificacionValida = (tipo: TipoIdentificacion, valor: string) => VALIDADORES[tipo](valor)
