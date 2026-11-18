/** Usa caracteres Unicode como el contrato de backend; no cuenta espacios de borde. */
export function errorMotivoAcceso(motivo: string): string | null {
  const limpio = motivo.trim()
  const cantidad = [...limpio].length
  if (cantidad < 10) {
    const faltan = 10 - cantidad
    return `El motivo necesita al menos 10 caracteres. ${faltan === 1 ? 'Falta 1 carácter.' : `Faltan ${faltan} caracteres.`}`
  }
  if (cantidad > 160) return 'El motivo debe tener como máximo 160 caracteres.'
  if ([...limpio].some((caracter) => caracter.charCodeAt(0) < 32 || caracter.charCodeAt(0) === 127)) {
    return 'Escribe el motivo en una sola línea, sin caracteres de control.'
  }
  return null
}
