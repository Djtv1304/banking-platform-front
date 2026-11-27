import { z } from 'zod'
import { aceptadaSchema, ApiError, apiClient, toApiError } from '@/shared/api'
import { CLIENTES_ENDPOINTS, clienteSchema } from '@/features/clientes/api/clientes.contract'
import type { RegistroClienteData } from '@/features/clientes/schemas/registro-cliente.schema'
import { codigoCatalogo, codigoCliente } from '@/features/clientes/api/documentos-identidad'

const ESTADO_CIVIL = { SOLTERO: 'Soltero', CASADO: 'Casado', DIVORCIADO: 'Divorciado', VIUDO: 'Viudo', UNION_HECHO: 'Union Libre' } as const
const TIPO_DIRECCION = { DOMICILIO: 'Domicilio', TRABAJO: 'Trabajo', CORRESPONDENCIA: 'Correspondencia', OTRA: 'Otra' } as const

export const clienteCreateSchema = z.object({
  identificacion: z.string().min(1).max(20), tipoDocumento: z.string().regex(/^[A-Z0-9]{1,10}$/), tipoCliente: z.literal('Natural'),
  codigoPaisEmision: z.string().length(3).optional(), fechaVencimiento: z.iso.date().optional(),
  nombres: z.string().trim().min(1).max(250), apellidos: z.string().trim().min(1).max(250),
  razonSocial: z.null(), nombreComercial: z.null(), fechaNacimiento: z.iso.date(),
  genero: z.enum(['M', 'F']), estadoCivil: z.enum(['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Union Libre']),
  codigoPaisNacionalidad: z.string().length(3), telefonoCelular: z.string().min(7).max(15),
  telefonoConvencional: z.string().max(15).nullable(), email: z.email().max(150),
  idActividadEconomica: z.number().int().positive(), consentimientoDatos: z.literal(true),
  direccion: z.object({
    tipoDireccion: z.enum(['Domicilio', 'Trabajo', 'Correspondencia', 'Otra']), codigoPais: z.string().length(3),
    idCiudad: z.number().int().positive(), sector: z.string().max(50).nullable(),
    calleDireccion: z.string().trim().min(1).max(250), referenciaUbicacion: z.string().trim().min(1).max(250),
    codigoPostal: z.string().regex(/^[0-9]{6}$/).nullable(), esPrincipal: z.literal(true),
  }).strict(),
}).strict()

export type ClienteCreatePayload = z.infer<typeof clienteCreateSchema>

export function aClienteCreate(registro: RegistroClienteData) {
  if (registro.cliente.tipoCliente !== 'NATURAL') throw new ApiError('El registro de empresas está pendiente de acordar con backend.', 400, 'JURIDICO_PENDIENTE')
  if (registro.direcciones.length !== 1 || !registro.direcciones[0].esPrincipal) throw new ApiError('Registra una sola dirección principal. Las adicionales se gestionan después.', 400, 'DIRECCION_PRINCIPAL_REQUERIDA')
  const { cliente, direcciones: [direccion] } = registro
  return clienteCreateSchema.parse({
    ...cliente, tipoCliente: 'Natural', tipoDocumento: codigoCliente(codigoCatalogo(cliente.tipoDocumento)),
    identificacion: cliente.identificacion.toUpperCase(),
    estadoCivil: ESTADO_CIVIL[cliente.estadoCivil as keyof typeof ESTADO_CIVIL],
    direccion: { ...direccion, tipoDireccion: TIPO_DIRECCION[direccion.tipoDireccion as keyof typeof TIPO_DIRECCION] },
  })
}

/** CLI-02. No reintentar POST automáticamente: una respuesta perdida no prueba rollback. */
export async function registrarCliente(registro: RegistroClienteData) {
  const payload = aClienteCreate(registro)
  const { data, status } = await apiClient.post<unknown>(CLIENTES_ENDPOINTS.registrar, payload)
  const respuesta = clienteSchema.extend({ idCliente: z.number().int().positive() }).safeParse(data)
  const mascara = payload.identificacion.length <= 4
    ? '*'.repeat(payload.identificacion.length)
    : '*'.repeat(payload.identificacion.length - 4) + payload.identificacion.slice(-4)
  if (status !== 201 || !respuesta.success || ![payload.identificacion, mascara].includes(respuesta.data.identificacion) || respuesta.data.tipoCliente !== payload.tipoCliente || respuesta.data.tipoDocumento !== payload.tipoDocumento) {
    throw new ApiError('No pudimos confirmar el registro. Busca la identificación en Consultar clientes antes de volver a enviarlo.', status, 'registro_sin_confirmar')
  }
  return respuesta.data
}

export async function reincorporarCliente(datos: RegistroClienteData | ClienteCreatePayload) {
  const payload = 'cliente' in datos ? aClienteCreate(datos) : clienteCreateSchema.parse(datos)
  const { data, status } = await apiClient.post<unknown>(CLIENTES_ENDPOINTS.reincorporar, payload)
  if (status !== 202) {
    throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  }
  const respuesta = aceptadaSchema.safeParse(data)
  if (!respuesta.success) {
    throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  }
  return respuesta.data
}

export function errorRegistro(error: unknown) {
  if (error instanceof z.ZodError) return 'Revisa los campos del formulario: los datos no coinciden con el formato requerido. No se envió el registro.'
  const e = toApiError(error)
  const mensajes: Record<string, string> = {
    DOCUMENTO_DUPLICADO: 'La identificación ya existe o requiere revisión. Consulta antes de continuar.',
    VENCIMIENTO_REQUERIDO: 'Ingresa el vencimiento del documento.',
    CLIENTE_DUPLICADO: 'Ya existe un cliente con esa identificación. Búscalo en Consultar clientes.',
    CLIENTE_ELIMINADO: 'Esta persona fue cliente y está eliminada. Puedes solicitar su reincorporación.',
    CLIENTE_NO_ELIMINADO: 'El cliente no está eliminado; no se puede solicitar su reincorporación.',
    CLIENTE_NO_ENCONTRADO: 'No se encontró un cliente con esa identificación.',
    DATOS_NO_COINCIDEN: 'El tipo de cliente o de documento no coincide con el registrado.',
    REINCORPORACION_PENDIENTE: 'Ya existe una solicitud de reincorporación pendiente para este cliente.',
    DOCUMENTO_INVALIDO: 'El backend rechazó el documento. Revisa la identificación del primer paso.',
    FECHA_NACIMIENTO_INVALIDA: 'La fecha de nacimiento debe ser anterior a hoy.',
    CONSENTIMIENTO_REQUERIDO: 'Confirma el consentimiento para registrar al cliente.',
    CATALOGO_INVALIDO: 'Algún país, ciudad o actividad no es válido. Revisa las selecciones del formulario.',
  }
  if (e.status === 403) return 'No tienes permiso para registrar clientes. Se requiere ASESOR o ADMIN y un usuario interno activo.'
  if (e.status === null || e.status >= 500) return 'No pudimos confirmar si el registro se guardó. Consulta la identificación antes de reenviar; tus datos siguen en el formulario.'
  return mensajes[e.code] ?? e.message
}
