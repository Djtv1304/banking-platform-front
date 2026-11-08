/*
 * Celular ecuatoriano. Localmente se escribe 09XXXXXXXX; en formato internacional se quita el 0:
 * +593 9XXXXXXXX. En el formulario se guardan solo los 9 dígitos nacionales (sin el 0) y al
 * enviar se transforman a E.164 (+5939XXXXXXXX).
 */

export const CELULAR_PREFIJO = '+593'

/** Quita formato, 593 y el 0 inicial; conserva dígitos de más para que la validación los rechace. */
export function normalizarCelular(valor: string) {
  let digitos = valor.replace(/\D/g, '')
  if (digitos.startsWith('593')) digitos = digitos.slice(3)
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  return digitos
}

/** 987654321 → "98 765 4321" */
export function formatearCelular(digitos: string) {
  return [digitos.slice(0, 2), digitos.slice(2, 5), digitos.slice(5)].filter(Boolean).join(' ')
}
