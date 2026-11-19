import { z } from 'zod'

/** Motivo de un cambio de estado o anulación: mínimo por defecto cuando es obligatorio */
export const MOTIVO_MINIMO_POR_DEFECTO = 10
export const MOTIVO_MAXIMO_POR_DEFECTO = 500

export interface OpcionesMotivo {
  obligatorio: boolean
  /** Obligatorio: 10 por defecto. Opcional: sólo se exige si se indica y hay texto */
  minimo?: number
  maximo?: number
}

/** Esquema del campo `motivo`: se recorta antes de medir, así que el valor validado ya viene sin espacios sobrantes */
export function esquemaMotivo({ obligatorio, minimo, maximo = MOTIVO_MAXIMO_POR_DEFECTO }: OpcionesMotivo) {
  const base = z.string().trim().max(maximo, `Usa como máximo ${maximo} caracteres.`)
  const exigido = obligatorio ? (minimo ?? MOTIVO_MINIMO_POR_DEFECTO) : minimo
  const texto = obligatorio
    ? base.min(1, 'Escribe el motivo.')
    : base
  return z.object({
    motivo:
      exigido && exigido > 1
        ? texto.refine((valor) => valor.length === 0 || valor.length >= exigido, `El motivo debe tener al menos ${exigido} caracteres.`)
        : texto,
  })
}

/** Mínimo efectivo que se anuncia en la ayuda del campo (null si no hay) */
export function minimoEfectivo({ obligatorio, minimo }: OpcionesMotivo): number | null {
  const valor = obligatorio ? (minimo ?? MOTIVO_MINIMO_POR_DEFECTO) : minimo
  return valor && valor > 1 ? valor : null
}
