import { z } from 'zod'

import {
  ESTADOS_ENTIDAD,
  type Entidad,
  type EntidadUpdate,
} from '@/features/organizacion/api/entidad.contract'

/*
 * Formulario de la entidad (PATCH). Los campos son texto y el esquema aplica las mismas reglas que
 * `EntidadUpdate` del backend. `cambiosEntidad` arma el body parcial: solo lo que cambió, con `null`
 * únicamente en los campos anulables.
 */

const RUC_REGEX = /^[0-9]{10}001$/
const IDENTIFICACION_REGEX = /^[0-9A-Z]{5,13}$/
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const SEGMENTO_REGEX = /^[1-5]$/

/** Un texto opcional: puede ir vacío (se envía null) pero no pasar del máximo */
const opcional = (max: number) =>
  z.string().trim().max(max, `Escribe como máximo ${max} caracteres.`)

/** Un texto obligatorio: no vacío y con el máximo del backend */
const obligatorio = (mensaje: string, max: number) =>
  z.string().trim().min(1, mensaje).max(max, `Escribe como máximo ${max} caracteres.`)

/** `YYYY-MM-DD` que existe en el calendario (rechaza 2026-02-31) */
export function esFechaValida(valor: string) {
  if (!FECHA_REGEX.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor)
}

export const entidadFormSchema = z.object({
  ruc: z.string().trim().regex(RUC_REGEX, 'El RUC debe tener 13 dígitos y terminar en 001.'),
  razonSocial: obligatorio('Ingresa la razón social.', 250),
  nombreComercial: opcional(150),
  tipoOrganizacion: obligatorio('Ingresa el tipo de organización.', 60),
  /** '' = sin segmento (null en el body) */
  segmento: z.string().refine((valor) => valor === '' || SEGMENTO_REGEX.test(valor), 'Elige un segmento del 1 al 5.'),
  numeroResolucionSeps: opcional(60),
  fechaConstitucion: z.string().refine(esFechaValida, 'Ingresa una fecha válida.'),
  representanteLegal: obligatorio('Ingresa el nombre del representante legal.', 250),
  identificacionRepresentante: z
    .string()
    .trim()
    .toUpperCase()
    .regex(IDENTIFICACION_REGEX, 'Usa de 5 a 13 caracteres: solo números y letras mayúsculas.'),
  telefono: opcional(15),
  email: opcional(150).refine(
    (valor) => valor === '' || z.email().safeParse(valor).success,
    'Ingresa un correo electrónico válido.',
  ),
  sitioWeb: opcional(150),
  estado: z.enum(ESTADOS_ENTIDAD, 'Elige el estado de la entidad.'),
})

export type EntidadFormInput = z.input<typeof entidadFormSchema>
export type EntidadFormData = z.output<typeof entidadFormSchema>

/** El formulario arranca con lo registrado: los null pasan a texto vacío */
export const valoresEntidad = (entidad: Entidad): EntidadFormInput => ({
  ruc: entidad.ruc,
  razonSocial: entidad.razonSocial,
  nombreComercial: entidad.nombreComercial ?? '',
  tipoOrganizacion: entidad.tipoOrganizacion,
  segmento: entidad.segmento === null ? '' : String(entidad.segmento),
  numeroResolucionSeps: entidad.numeroResolucionSeps ?? '',
  fechaConstitucion: entidad.fechaConstitucion,
  representanteLegal: entidad.representanteLegal,
  identificacionRepresentante: entidad.identificacionRepresentante,
  telefono: entidad.telefono ?? '',
  email: entidad.email ?? '',
  sitioWeb: entidad.sitioWeb ?? '',
  estado: entidad.estado,
})

/** Obligatorios en el backend (no admiten null) */
const CAMPOS_OBLIGATORIOS = [
  'ruc',
  'razonSocial',
  'tipoOrganizacion',
  'fechaConstitucion',
  'representanteLegal',
  'identificacionRepresentante',
  'estado',
] as const

/** Anulables de texto: vacíos se envían como null */
const CAMPOS_ANULABLES = ['nombreComercial', 'numeroResolucionSeps', 'telefono', 'email', 'sitioWeb'] as const

/**
 * Body del PATCH con SOLO los campos que cambiaron respecto a lo registrado. Un anulable vaciado va
 * como `null`; uno que ya estaba en null y sigue vacío no se envía. `{}` = nada que guardar.
 */
export function cambiosEntidad(entidad: Entidad, datos: EntidadFormData): EntidadUpdate {
  const actual = valoresEntidad(entidad)
  const cambios: Record<string, string | number | null> = {}

  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (datos[campo] !== actual[campo].trim()) cambios[campo] = datos[campo]
  }
  for (const campo of CAMPOS_ANULABLES) {
    if (datos[campo] !== actual[campo].trim()) cambios[campo] = datos[campo] || null
  }
  if (datos.segmento !== actual.segmento) cambios.segmento = datos.segmento === '' ? null : Number(datos.segmento)

  return cambios as EntidadUpdate
}

export const hayCambios = (cambios: EntidadUpdate) => Object.keys(cambios).length > 0
