import { z } from 'zod'

import { CELULAR_PREFIJO } from '@/features/clientes/lib/celular'
import { esCedulaValida, esRucValido } from '@/features/clientes/lib/identificacion'

/*
 * Registro de cliente en 3 pasos, un esquema por paso. Cada salida usa los nombres de columna
 * de las tablas Cliente y Direcciones (camelCase). Los campos que asigna el backend
 * (IdCliente, Estado, FechaRegistro, FechaConsentimiento, CreadoPor) no se piden aquí.
 */

// ─── Opciones ────────────────────────────────────────────────────────────────

// TODO(API): confirmar con el backend los valores de TipoCliente (varchar(10))
export const TIPOS_CLIENTE = [
  { value: 'NATURAL', label: 'Persona natural', documento: 'Cédula' },
  { value: 'JURIDICO', label: 'Persona jurídica', documento: 'RUC' },
] as const
export type TipoCliente = (typeof TIPOS_CLIENTE)[number]['value']

/** Natural se identifica con cédula y jurídico con RUC */
// TODO(API): confirmar los valores de TipoDocumento (varchar(10)); antes se usaban C / R
const TIPO_DOCUMENTO = { NATURAL: 'CEDULA', JURIDICO: 'RUC' } as const satisfies Record<TipoCliente, string>

// TODO(API): confirmar los códigos de Genero (char(1))
export const GENEROS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
] as const

// TODO(API): confirmar los valores de EstadoCivil (varchar(20)) o si vendrán de un catálogo
export const ESTADOS_CIVILES = [
  { value: 'SOLTERO', label: 'Soltero/a' },
  { value: 'CASADO', label: 'Casado/a' },
  { value: 'UNION_HECHO', label: 'Unión de hecho' },
  { value: 'DIVORCIADO', label: 'Divorciado/a' },
  { value: 'VIUDO', label: 'Viudo/a' },
] as const

// TODO(API): confirmar los valores de TipoDireccion (varchar(20)) o si vendrán de un catálogo
export const TIPOS_DIRECCION = [
  { value: 'DOMICILIO', label: 'Domicilio' },
  { value: 'TRABAJO', label: 'Trabajo' },
  { value: 'NEGOCIO', label: 'Negocio' },
  { value: 'OTRA', label: 'Otra' },
] as const

// ─── Utilidades ──────────────────────────────────────────────────────────────

const NOMBRE_REGEX = /^[\p{L}' -]+$/u
const EDAD_MAXIMA = 120

function esFechaNacimientoValida(valor: string) {
  const fecha = new Date(`${valor}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return false
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - EDAD_MAXIMA)
  return fecha <= new Date() && fecha >= limite
}

/** '' → null, para columnas opcionales */
const vacioANull = (valor: string) => valor || null

const texto = (max: number, mensajeMax: string) => z.string().trim().max(max, mensajeMax)

// ─── Paso 1: datos del cliente ───────────────────────────────────────────────

export const datosClienteSchema = z
  .object({
    tipoCliente: z.enum(['NATURAL', 'JURIDICO'], { error: 'Selecciona el tipo de cliente' }),
    identificacion: z.string().trim(),
    // Persona natural
    nombres: texto(250, 'Los nombres no pueden superar 250 caracteres'),
    apellidos: texto(250, 'Los apellidos no pueden superar 250 caracteres'),
    fechaNacimiento: z.string(),
    genero: z.string(),
    estadoCivil: z.string(),
    codigoPaisNacionalidad: z.string(),
    // Persona jurídica
    razonSocial: texto(250, 'La razón social no puede superar 250 caracteres'),
    nombreComercial: texto(250, 'El nombre comercial no puede superar 250 caracteres'),
    // Contacto
    telefonoCelular: z.string().regex(/^9\d{8}$/, 'Ingresa un celular válido: 09 seguido de 8 dígitos'),
    telefonoConvencional: z
      .string()
      .regex(/^(0[2-7]\d{7})?$/, 'Ingresa un teléfono válido: 0, código de provincia y 7 dígitos'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Ingresa el correo electrónico')
      .max(150, 'El correo no puede superar 150 caracteres')
      .pipe(z.email('Ingresa un correo válido')),
  })
  .superRefine(
    (datos, ctx) => {
      const error = (path: keyof typeof datos, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

      if (datos.tipoCliente === 'JURIDICO') {
        if (!esRucValido(datos.identificacion)) error('identificacion', 'Ingresa un RUC válido de 13 dígitos')
        if (!datos.razonSocial) error('razonSocial', 'Ingresa la razón social')
        return
      }

      if (!esCedulaValida(datos.identificacion)) error('identificacion', 'Ingresa una cédula válida de 10 dígitos')
      for (const campo of ['nombres', 'apellidos'] as const) {
        if (datos[campo].length < 2) error(campo, `Ingresa los ${campo}`)
        else if (!NOMBRE_REGEX.test(datos[campo])) error(campo, `Los ${campo} solo pueden contener letras y espacios`)
      }
      if (!datos.fechaNacimiento) error('fechaNacimiento', 'Ingresa la fecha de nacimiento')
      else if (!esFechaNacimientoValida(datos.fechaNacimiento))
        error('fechaNacimiento', 'Ingresa una fecha de nacimiento válida')
      if (!datos.genero) error('genero', 'Selecciona el género')
      if (!datos.estadoCivil) error('estadoCivil', 'Selecciona el estado civil')
      if (!datos.codigoPaisNacionalidad) error('codigoPaisNacionalidad', 'Selecciona la nacionalidad')
    },
    // Las reglas por tipo se evalúan aunque haya errores en el contacto
    { when: ({ issues }) => !issues.some(({ path }) => path?.[0] === 'tipoCliente') },
  )
  .transform(({ tipoCliente, telefonoCelular, telefonoConvencional, ...datos }) => {
    const natural = tipoCliente === 'NATURAL'
    return {
      tipoCliente,
      tipoDocumento: TIPO_DOCUMENTO[tipoCliente],
      identificacion: datos.identificacion,
      razonSocial: natural ? null : datos.razonSocial,
      nombreComercial: natural ? null : vacioANull(datos.nombreComercial),
      nombres: natural ? datos.nombres : null,
      apellidos: natural ? datos.apellidos : null,
      fechaNacimiento: natural ? datos.fechaNacimiento : null,
      genero: natural ? datos.genero : null,
      estadoCivil: natural ? datos.estadoCivil : null,
      codigoPaisNacionalidad: natural ? datos.codigoPaisNacionalidad : null,
      telefonoCelular: `${CELULAR_PREFIJO}${telefonoCelular}`,
      telefonoConvencional: vacioANull(telefonoConvencional),
      email: datos.email,
    }
  })

export type DatosClienteInput = z.input<typeof datosClienteSchema>
export type DatosClienteData = z.output<typeof datosClienteSchema>

export const DATOS_CLIENTE_VACIOS: DatosClienteInput = {
  tipoCliente: 'NATURAL',
  identificacion: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  genero: '',
  estadoCivil: '',
  codigoPaisNacionalidad: 'ECU',
  razonSocial: '',
  nombreComercial: '',
  telefonoCelular: '',
  telefonoConvencional: '',
  email: '',
}

// ─── Paso 2: direcciones ─────────────────────────────────────────────────────

const direccionSchema = z
  .object({
    tipoDireccion: z.string().min(1, 'Selecciona el tipo de dirección'),
    // codigoPais y provincia solo filtran el selector de ciudad; a la tabla va idCiudad
    codigoPais: z.string().min(1, 'Selecciona el país'),
    provincia: z.string().min(1, 'Selecciona la provincia'),
    idCiudad: z.string().min(1, 'Selecciona la ciudad'),
    sector: texto(50, 'El sector no puede superar 50 caracteres'),
    calleDireccion: texto(250, 'La dirección no puede superar 250 caracteres').min(1, 'Ingresa la calle y número'),
    referenciaUbicacion: texto(250, 'La referencia no puede superar 250 caracteres').min(1, 'Ingresa una referencia'),
    codigoPostal: z.string().trim().regex(/^(\d{6})?$/, 'El código postal tiene 6 dígitos'),
    esPrincipal: z.boolean(),
  })
  .transform((direccion) => ({
    tipoDireccion: direccion.tipoDireccion,
    idCiudad: Number(direccion.idCiudad),
    sector: vacioANull(direccion.sector),
    calleDireccion: direccion.calleDireccion,
    referenciaUbicacion: direccion.referenciaUbicacion,
    codigoPostal: vacioANull(direccion.codigoPostal),
    esPrincipal: direccion.esPrincipal,
  }))

export const direccionesSchema = z.object({
  direcciones: z
    .array(direccionSchema)
    .min(1, 'Agrega al menos una dirección')
    .refine((direcciones) => direcciones.filter((d) => d.esPrincipal).length === 1, 'Marca una dirección como principal'),
})

export type DireccionesInput = z.input<typeof direccionesSchema>
export type DireccionesData = z.output<typeof direccionesSchema>
export type DireccionInput = DireccionesInput['direcciones'][number]

export const nuevaDireccion = (esPrincipal: boolean): DireccionInput => ({
  tipoDireccion: esPrincipal ? 'DOMICILIO' : '',
  codigoPais: 'ECU',
  provincia: '',
  idCiudad: '',
  sector: '',
  calleDireccion: '',
  referenciaUbicacion: '',
  codigoPostal: '',
  esPrincipal,
})

export const DIRECCIONES_VACIAS: DireccionesInput = { direcciones: [nuevaDireccion(true)] }

// ─── Paso 3: actividad económica y consentimiento ────────────────────────────

export const actividadSchema = z.object({
  idActividadEconomica: z.string().min(1, 'Selecciona la actividad económica').transform(Number),
  consentimientoDatos: z.boolean().refine(Boolean, 'Se requiere el consentimiento para el tratamiento de datos'),
})

export type ActividadInput = z.input<typeof actividadSchema>
export type ActividadData = z.output<typeof actividadSchema>

export const ACTIVIDAD_VACIA: ActividadInput = { idActividadEconomica: '', consentimientoDatos: false }

// ─── Solicitud completa ──────────────────────────────────────────────────────

export interface RegistroClienteData {
  cliente: DatosClienteData & ActividadData
  direcciones: DireccionesData['direcciones']
}
