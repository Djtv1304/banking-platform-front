/*
 * Celular ecuatoriano. Localmente se escribe 09XXXXXXXX; en formato internacional se quita el 0:
 * +593 9XXXXXXXX. En el formulario se guardan solo los 9 dígitos nacionales (sin el 0) y al
 * enviar se transforman a E.164 (+5939XXXXXXXX).
 */

export const CELULAR_PREFIJO = '+593'

/** Normaliza lo que escribe el usuario: solo dígitos, sin 593 ni el 0 inicial, máximo 9 dígitos. */
export function normalizarCelular(valor: string) {
  let digitos = valor.replace(/\D/g, '')
  if (digitos.startsWith('593')) digitos = digitos.slice(3)
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  return digitos.slice(0, 9)
}

/** 987654321 → "98 765 4321" */
export function formatearCelular(digitos: string) {
  return [digitos.slice(0, 2), digitos.slice(2, 5), digitos.slice(5, 9)].filter(Boolean).join(' ')
}
