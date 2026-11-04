import { z } from 'zod'

import { CELULAR_PREFIJO } from '@/features/clientes/lib/celular'
import { validarIdentificacion } from '@/features/clientes/lib/identificacion'

export const TIPOS_DOCUMENTO = [
  { value: 'C', label: 'Cédula' },
  { value: 'R', label: 'RUC' },
  { value: 'P', label: 'Pasaporte' },
] as const

export const GENEROS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
] as const

const NOMBRE_REGEX = /^[\p{L}' -]+$/u
const EDAD_MAXIMA = 120

function esFechaNacimientoValida(valor: string) {
  const fecha = new Date(`${valor}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return false
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - EDAD_MAXIMA)
  return fecha <= new Date() && fecha >= limite
}

const nombreSchema = (campo: string) =>
  z
    .string()
    .trim()
    .min(2, `Ingresa los ${campo}`)
    .max(100, `Los ${campo} no pueden superar 100 caracteres`)
    .regex(NOMBRE_REGEX, `Los ${campo} solo pueden contener letras y espacios`)

export const registroClienteSchema = z
  .object({
    tipoDocumento: z.enum(['C', 'R', 'P'], { error: 'Selecciona el tipo de documento' }),
    identificacion: z.string().trim().toUpperCase().min(1, 'Ingresa la identificación'),
    nombres: nombreSchema('nombres'),
    apellidos: nombreSchema('apellidos'),
    fechaNacimiento: z
      .string()
      .min(1, 'Ingresa la fecha de nacimiento')
      .refine(esFechaNacimientoValida, 'Ingresa una fecha de nacimiento válida'),
    genero: z.enum(['M', 'F', 'O'], { error: 'Selecciona el género' }),
    telefonoCelular: z
      .string()
      .regex(/^9\d{8}$/, 'Ingresa un celular válido: 09 seguido de 8 dígitos')
      .transform((digitos) => `${CELULAR_PREFIJO}${digitos}`),
    email: z.string().trim().toLowerCase().min(1, 'Ingresa el correo electrónico').pipe(z.email('Ingresa un correo válido')),
    consentimientoDatos: z.boolean().refine(Boolean, 'Se requiere el consentimiento para el tratamiento de datos'),
  })
  .superRefine(
    ({ tipoDocumento, identificacion }, ctx) => {
      const error = validarIdentificacion(tipoDocumento, identificacion)
      if (error) ctx.addIssue({ code: 'custom', path: ['identificacion'], message: error })
    },
    {
      // Se valida aunque otros campos tengan errores, siempre que tipo e identificación estén completos
      when: ({ issues }) =>
        !issues.some(({ path }) => path?.[0] === 'tipoDocumento' || path?.[0] === 'identificacion'),
    },
  )

/** Valores del formulario (antes de transformar) */
export type RegistroClienteFormInput = z.input<typeof registroClienteSchema>
/** Datos listos para enviar (celular en formato +593…) */
export type RegistroClienteData = z.output<typeof registroClienteSchema>
