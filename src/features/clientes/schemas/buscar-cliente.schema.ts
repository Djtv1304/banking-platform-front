import { z } from 'zod'

import type { TipoIdentificacion } from '@/features/clientes/api/clientes.contract'
import {
  detectarTipoIdentificacion,
  esIdentificacionValida,
  normalizarIdentificacion,
} from '@/features/clientes/lib/identificacion'

export const TIPOS_IDENTIFICACION: Record<TipoIdentificacion, { label: string; mensaje: string }> = {
  CEDULA: { label: 'Cédula', mensaje: 'La cédula no es válida: revisa los 10 dígitos' },
  RUC: { label: 'RUC', mensaje: 'El RUC no es válido: revisa los 13 dígitos' },
  PASAPORTE: { label: 'Pasaporte', mensaje: 'El pasaporte debe tener de 5 a 20 letras o números' },
}

/** Lo más largo que se acepta: un pasaporte (la cédula tiene 10 y el RUC 13) */
export const IDENTIFICACION_MAX_LENGTH = 20

const tipoDocumentoSchema = z.enum(['CEDULA', 'RUC', 'PASAPORTE'])

const validarDocumento = (
  { tipoDocumento, identificacion }: { tipoDocumento: TipoIdentificacion; identificacion: string },
  ctx: z.RefinementCtx,
) => {
  if (!esIdentificacionValida(tipoDocumento, identificacion)) {
    ctx.addIssue({ code: 'custom', path: ['identificacion'], message: TIPOS_IDENTIFICACION[tipoDocumento].mensaje })
  }
}

/** Criterio ya resuelto (tipo + número). Valida lo que llega en la URL antes de consultar. */
export const buscarClienteSchema = z
  .object({
    tipoDocumento: tipoDocumentoSchema,
    identificacion: z.string().trim().toUpperCase().max(IDENTIFICACION_MAX_LENGTH),
  })
  .superRefine(validarDocumento)

export type BuscarClienteData = z.output<typeof buscarClienteSchema>

/**
 * Formulario del buscador: solo se escribe el número y el tipo se detecta solo. `comoPasaporte`
 * cubre el pasaporte numérico de 10 o 13 dígitos, que se confundiría con una cédula o un RUC.
 * Nunca se busca (ni se registra) un documento inválido.
 */
export const buscarClienteFormSchema = z
  .object({
    identificacion: z
      .string()
      .transform(normalizarIdentificacion)
      .pipe(z.string().min(1, 'Ingresa la cédula, el RUC o el pasaporte').max(IDENTIFICACION_MAX_LENGTH)),
    comoPasaporte: z.boolean(),
  })
  .transform(({ identificacion, comoPasaporte }) => ({
    tipoDocumento: detectarTipoIdentificacion(identificacion, comoPasaporte)!,
    identificacion,
  }))
  .superRefine(validarDocumento)

export type BuscarClienteFormInput = z.input<typeof buscarClienteFormSchema>
