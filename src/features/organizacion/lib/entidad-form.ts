import { z } from 'zod'

import type { Entidad, EntidadPatch } from '@/features/organizacion/api/entidad'

const obligatorio = (max: number) =>
  z.string().trim().min(1, 'Completa este campo.').max(max, `Usa hasta ${max} caracteres.`)

const opcional = (max: number) =>
  z.string().trim().max(max, `Usa hasta ${max} caracteres.`)

export const entidadFormSchema = z.object({
  ruc: z.string().trim().regex(
    /^[0-9]{10}001$/,
    'Usa 13 dígitos terminados en 001, según el contrato institucional.',
  ),
  razonSocial: obligatorio(250),
  nombreComercial: opcional(150),
  tipoOrganizacion: obligatorio(60),
  segmento: z.enum(['', '1', '2', '3', '4', '5']),
  numeroResolucionSeps: opcional(60),
  fechaConstitucion: z.iso.date('Ingresa una fecha válida.'),
  representanteLegal: obligatorio(250),
  identificacionRepresentante: z.string().trim().toUpperCase().regex(
    /^[0-9A-Z]{5,13}$/,
    'Usa entre 5 y 13 letras o dígitos.',
  ),
  telefono: opcional(15).refine(
    (v) => !v || (/^[0-9+() -]+$/.test(v) && /[0-9]/.test(v)),
    'Ingresa un teléfono con dígitos y signos de formato.',
  ),
  email: opcional(150).refine(
    (v) => !v || z.email().safeParse(v).success,
    'Ingresa un correo válido.',
  ),
  sitioWeb: opcional(150).refine(
    (v) => !v || z.url({ protocol: /^https?$/ }).safeParse(v).success,
    'Ingresa una dirección completa con https:// o http://.',
  ),
})

export type EntidadForm = z.infer<typeof entidadFormSchema>

export function valoresEntidad(entidad: Entidad): EntidadForm {
  return {
    ruc: entidad.ruc,
    razonSocial: entidad.razonSocial,
    nombreComercial: entidad.nombreComercial ?? '',
    tipoOrganizacion: entidad.tipoOrganizacion,
    segmento: entidad.segmento?.toString() as EntidadForm['segmento'] ?? '',
    numeroResolucionSeps: entidad.numeroResolucionSeps ?? '',
    fechaConstitucion: entidad.fechaConstitucion,
    representanteLegal: entidad.representanteLegal,
    identificacionRepresentante: entidad.identificacionRepresentante,
    telefono: entidad.telefono ?? '',
    email: entidad.email ?? '',
    sitioWeb: entidad.sitioWeb ?? '',
  }
}

export function cambiosEntidad(original: Entidad, formulario: EntidadForm): EntidadPatch {
  const values = entidadFormSchema.parse(formulario)
  const anteriores = valoresEntidad(original)
  const cambios: Record<string, string | number | null> = {}

  for (const key of Object.keys(values) as (keyof EntidadForm)[]) {
    // Un vacío ya persistido (NULL o '') no requiere otra escritura.
    if (values[key] === anteriores[key]) continue

    cambios[key] = key === 'segmento'
      ? (values[key] ? Number(values[key]) : null)
      : values[key] || null
  }

  return cambios as EntidadPatch
}

export function fechaEntidad(valor: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor.split('-').reverse().join('/')
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(valor)) return `${valor.replace('T', ' ')} (sin zona informada)`

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(valor))
}
