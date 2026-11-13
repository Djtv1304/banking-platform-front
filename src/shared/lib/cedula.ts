/** Códigos de provincia válidos en Ecuador: 01–24 y 30 (ecuatorianos registrados en el exterior) */
export function esProvinciaValida(codigo: number) {
  return (codigo >= 1 && codigo <= 24) || codigo === 30
}

/** Cédula ecuatoriana: 10 dígitos, provincia válida, tercer dígito < 6 y dígito verificador (módulo 10). */
export function esCedulaValida(cedula: string) {
  if (!/^\d{10}$/.test(cedula)) return false
  if (!esProvinciaValida(Number(cedula.slice(0, 2))) || Number(cedula[2]) >= 6) return false

  const suma = [...cedula.slice(0, 9)].reduce((total, digito, index) => {
    const producto = Number(digito) * (index % 2 === 0 ? 2 : 1)
    return total + (producto > 9 ? producto - 9 : producto)
  }, 0)
  const verificador = (10 - (suma % 10)) % 10
  return verificador === Number(cedula[9])
}
