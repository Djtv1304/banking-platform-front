import { z } from 'zod'

import { ARCHIVO_TAMANO_MAXIMO, ARCHIVO_TIPOS_PERMITIDOS } from '@/features/clientes/lib/documentos'

export const subirDocumentoSchema = z.object({
  categoria: z.enum(
    ['APERTURA_CUENTA', 'CONTRATO_CUENTA', 'SOLICITUD_TARJETA', 'CREDITO', 'IDENTIFICACION', 'OTROS'],
    { error: 'Selecciona la categoría' },
  ),
  nombre: z
    .string()
    .trim()
    .min(3, 'Ingresa un nombre descriptivo')
    .max(150, 'El nombre no puede superar 150 caracteres'),
  referencia: z
    .string()
    .trim()
    .max(50, 'La referencia no puede superar 50 caracteres')
    .transform((valor) => valor || null),
  archivo: z
    .instanceof(File, { error: 'Selecciona un archivo' })
    .refine((archivo) => (ARCHIVO_TIPOS_PERMITIDOS as readonly string[]).includes(archivo.type), 'Solo se aceptan PDF, JPG o PNG')
    .refine((archivo) => archivo.size <= ARCHIVO_TAMANO_MAXIMO, 'El archivo no puede superar 10 MB'),
})

export type SubirDocumentoInput = z.input<typeof subirDocumentoSchema>
export type SubirDocumentoData = z.output<typeof subirDocumentoSchema>
