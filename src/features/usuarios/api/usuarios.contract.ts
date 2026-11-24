import { z } from 'zod'

import { esCedulaValida } from '@/shared/lib'

/*
 * Contrato de usuarios internos (gestión de accesos) en camelCase.
 *
 * - AUT-05 GET  /usuarios?q&estado&idAgencia&rol&vinculado&page&pageSize&sort → listado paginado
 * - AUT-06 POST /usuarios → crea el usuario y lo invita a EnquoCoop con su rol (201)
 * - AUT-07 GET  /usuarios/{idUsuario} → detalle (`estadoInvitacion` solo si aún no está vinculado)
 * - AUT-08 PATCH /usuarios/{idUsuario} → nombres, apellidos, email, idAgencia o estado (motivo al bloquear).
 *   Bloquear o desactivar corta las sesiones del usuario en WorkOS.
 * - AUT-09 PUT  /usuarios/{idUsuario}/roles → reemplaza el rol (uno). No se puede quitar el último ADMIN.
 *
 * Roles: ADMIN. Los errores llegan como ProblemDetails con `errors: [{ field, message }]`;
 * el 503 indica que WorkOS (invitaciones) no está disponible. Los esquemas de respuesta solo validan
 * los campos que usa la pantalla; zod descarta el resto.
 */

const BASE = '/api/v1/usuarios'

export const USUARIOS_ENDPOINTS = {
  listar: BASE,
  crear: BASE,
  detalle: (idUsuario: number) => `${BASE}/${idUsuario}`,
  roles: (idUsuario: number) => `${BASE}/${idUsuario}/roles`,
} as const

export const ROLES_USUARIO = [
  'ADMIN',
  'ASESOR',
  'CAJERO',
  'SUPERVISOR',
  'APROBADOR_CREDITO',
  'CONTADOR',
  'AUDITOR',
] as const

export const rolUsuarioSchema = z.enum(ROLES_USUARIO)

// TODO(API): confirmar los valores de `estado` que acepta el filtro de AUT-05 (hoy se ven «Activo» e «Inactivo»)
export const ESTADOS_USUARIO = ['Activo', 'Inactivo', 'Bloqueado'] as const

export const CAMPOS_ORDEN = ['idUsuario', 'username', 'nombres', 'apellidos', 'email', 'roles', 'idAgencia', 'estado', 'fechaCreacion'] as const

export type CampoOrden = (typeof CAMPOS_ORDEN)[number]

/** `idAgencia` siempre son 3 dígitos (pattern de AUT-05 y AUT-06) */
export const ID_AGENCIA_REGEX = /^\d{3}$/

/** AUT-05 · Cada fila. `rol` es null mientras el usuario no tenga uno asignado */
export const usuarioResumenSchema = z.object({
  roles: z.array(rolUsuarioSchema).optional(),
  idUsuario: z.number(),
  username: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  email: z.string(),
  // Texto y no enum: un rol nuevo del backend no debe romper el listado (se muestra en palabras)
  rol: z.string().nullable(),
  estado: z.string(),
  idAgencia: z.string().nullable(),
  vinculado: z.boolean(),
  fechaCreacion: z.string(),
})

export const paginaUsuariosSchema = z.object({
  items: z.array(usuarioResumenSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

/**
 * AUT-06 (201), AUT-07, AUT-08 y AUT-09 (200) responden el mismo detalle.
 * `vinculado`: el usuario ya completó su primer ingreso y su cuenta de acceso quedó asociada.
 * `estadoInvitacion`: estado de la invitación de WorkOS (pending, accepted…); null si ya está vinculado.
 */
export const usuarioDetalleSchema = usuarioResumenSchema.extend({
  cedula: z.string().nullish(),
  ultimoAcceso: z.string().nullish(),
  estadoInvitacion: z.string().nullish(),
  bloqueo: z
    .object({
      motivo: z.string().nullish(),
      fechaBloqueo: z.string().nullish(),
      observaciones: z.string().nullish(),
    })
    .nullish(),
})

export const usuarioCreadoSchema = usuarioDetalleSchema

/*
 * AUT-06 · Body. Límites de texto pendientes de confirmar con el backend.
 * TODO(API): ajustar los máximos de username, nombres, apellidos y email al contrato definitivo.
 */
export const USUARIO_LIMITES = { username: 50, nombres: 100, apellidos: 100, email: 150 } as const

export const crearUsuarioSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Usa al menos 3 caracteres.')
      .max(USUARIO_LIMITES.username, `Usa hasta ${USUARIO_LIMITES.username} caracteres.`)
      .regex(/^[A-Za-z0-9._-]+$/, 'Usa solo letras sin tildes, números, punto, guion o guion bajo, sin espacios.'),
    nombres: z
      .string()
      .trim()
      .min(1, 'Ingresa los nombres.')
      .max(USUARIO_LIMITES.nombres, `Usa hasta ${USUARIO_LIMITES.nombres} caracteres.`),
    apellidos: z
      .string()
      .trim()
      .min(1, 'Ingresa los apellidos.')
      .max(USUARIO_LIMITES.apellidos, `Usa hasta ${USUARIO_LIMITES.apellidos} caracteres.`),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(USUARIO_LIMITES.email, `Usa hasta ${USUARIO_LIMITES.email} caracteres.`)
      .pipe(z.email('Ingresa un correo válido. A este correo llegará la invitación.')),
    cedula: z
      .string()
      .trim()
      .refine(esCedulaValida, 'Ingresa una cédula ecuatoriana válida de 10 dígitos.'),
    idAgencias: z.array(z.string().regex(ID_AGENCIA_REGEX)).max(100).optional(),
    idAgencia: z.string().regex(ID_AGENCIA_REGEX, 'Elige la agencia donde operará.'),
    // Entra como texto (el select empieza vacío) y sale como uno de los 7 roles
    rol: z.string().pipe(z.enum(ROLES_USUARIO, 'Elige el rol del usuario.')),
  })
  .strict()

/*
 * AUT-08 · Body. Se envían solo los campos que cambian. El estado va en su propio PATCH porque
 * tiene confirmación y, al bloquear, motivo obligatorio.
 * TODO(API): confirmar los máximos de motivo y observaciones.
 */
export const BLOQUEO_LIMITES = { motivo: 200, observaciones: 500 } as const

export const editarDatosSchema = z.object({
  nombres: crearUsuarioSchema.shape.nombres,
  apellidos: crearUsuarioSchema.shape.apellidos,
  email: crearUsuarioSchema.shape.email,
})

export const cambiarAgenciaSchema = z.object({ idAgencia: crearUsuarioSchema.shape.idAgencia })

export const cambioEstadoSchema = z.discriminatedUnion('estado', [
  z.object({ estado: z.literal('Activo') }).strict(),
  z.object({ estado: z.literal('Inactivo') }).strict(),
  z
    .object({
      estado: z.literal('Bloqueado'),
      motivo: z
        .string()
        .trim()
        .min(1, 'Escribe el motivo del bloqueo.')
        .max(BLOQUEO_LIMITES.motivo, `Usa hasta ${BLOQUEO_LIMITES.motivo} caracteres.`),
      observaciones: z
        .string()
        .trim()
        .max(BLOQUEO_LIMITES.observaciones, `Usa hasta ${BLOQUEO_LIMITES.observaciones} caracteres.`)
        // Vacío no se envía
        .transform((valor) => valor || undefined)
        .optional(),
    })
    .strict(),
])

export const edicionUsuarioSchema = z.union([
  editarDatosSchema.partial().strict().refine((cambios) => Object.keys(cambios).length > 0, 'No hay cambios para guardar.'),
  cambiarAgenciaSchema.strict(),
  cambioEstadoSchema,
])

/** AUT-09 · Body */
export const cambiarRolSchema = z.object({ rol: rolUsuarioSchema }).strict()

export type UsuarioResumen = z.infer<typeof usuarioResumenSchema>
export type UsuarioDetalle = z.infer<typeof usuarioDetalleSchema>
export type EditarDatosInput = z.input<typeof editarDatosSchema>
export type EditarDatos = z.output<typeof editarDatosSchema>
export type CambioEstadoInput = z.input<typeof cambioEstadoSchema>
export type CambioEstado = z.output<typeof cambioEstadoSchema>
export type EdicionUsuario = z.input<typeof edicionUsuarioSchema>
export type EstadoUsuario = CambioEstado['estado']
export type PaginaUsuarios = z.infer<typeof paginaUsuariosSchema>
export type UsuarioCreado = z.infer<typeof usuarioCreadoSchema>
export type RolUsuario = z.infer<typeof rolUsuarioSchema>
export type CrearUsuarioInput = z.input<typeof crearUsuarioSchema>
export type CrearUsuario = z.output<typeof crearUsuarioSchema>
