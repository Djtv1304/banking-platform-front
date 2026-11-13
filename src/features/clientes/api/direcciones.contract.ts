import { z } from 'zod'

export const TIPOS_DIRECCION_GESTION = ['Domicilio', 'Trabajo', 'Correspondencia', 'Otra'] as const

export const direccionGestionSchema = z.object({
  idDireccion: z.number().int().positive(),
  tipoDireccion: z.enum(TIPOS_DIRECCION_GESTION),
  codigoPais: z.string().length(3),
  idCiudad: z.number().int().positive(),
  sector: z.string().nullable(),
  calleDireccion: z.string(),
  referenciaUbicacion: z.string(),
  codigoPostal: z.string().nullable(),
  esPrincipal: z.boolean(),
  estado: z.enum(['Activo', 'Inactivo', 'Eliminado']),
})

export const direccionNuevaSchema = z.object({
  tipoDireccion: z.enum(TIPOS_DIRECCION_GESTION),
  codigoPais: z.string().regex(/^[A-Z]{3}$/, 'Selecciona un país válido'),
  idCiudad: z.number().int().positive(),
  sector: z.string().max(50).nullable(),
  calleDireccion: z.string().trim().min(1).max(250),
  referenciaUbicacion: z.string().trim().min(1).max(250),
  codigoPostal: z.string().regex(/^\d{6}$/).nullable(),
  esPrincipal: z.boolean(),
}).strict()

export const direccionCambioSchema = direccionNuevaSchema.partial()
  .refine((body) => Object.keys(body).length > 0, 'No hay cambios para guardar')

export const DIRECCIONES_ENDPOINTS = {
  lista: (idCliente: number) => `/api/v1/clientes/${idCliente}/direcciones`,
  detalle: (idCliente: number, idDireccion: number) => `/api/v1/clientes/${idCliente}/direcciones/${idDireccion}`,
} as const

export type DireccionGestion = z.infer<typeof direccionGestionSchema>
export type DireccionNueva = z.infer<typeof direccionNuevaSchema>
export type DireccionCambio = z.infer<typeof direccionCambioSchema>
