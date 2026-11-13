import { esCedulaValida, esProvinciaValida } from '@/shared/lib'

// La cédula es común a clientes y usuarios internos: vive en shared/lib
export { esCedulaValida }

/** Formato de CLI-01/CLI-02: no comprueba autenticidad ni vigencia del documento. */
export function esPasaporteValido(pasaporte: string) {
  return /^[A-Za-z0-9]{5,13}$/.test(pasaporte)
}

/**
 * RUC: 13 dígitos y establecimiento distinto de 000. Para personas naturales (tercer dígito < 6)
 * los 10 primeros dígitos deben ser una cédula válida. Para sociedades (6 y 9) solo se valida
 * estructura y provincia: su dígito verificador tiene excepciones y lo confirma el backend.
 */
export function esRucValido(ruc: string) {
  if (!/^\d{13}$/.test(ruc) || ruc.endsWith('000')) return false
  if (!esProvinciaValida(Number(ruc.slice(0, 2)))) return false

  const tercerDigito = Number(ruc[2])
  if (tercerDigito < 6) return esCedulaValida(ruc.slice(0, 10))
  return tercerDigito === 6 || tercerDigito === 9
}
