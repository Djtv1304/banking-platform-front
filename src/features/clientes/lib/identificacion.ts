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
  if (!provinciaValida(Number(ruc.slice(0, 2)))) return false

  const tercerDigito = Number(ruc[2])
  if (tercerDigito < 6) return esCedulaValida(ruc.slice(0, 10))
  return tercerDigito === 6 || tercerDigito === 9
}
