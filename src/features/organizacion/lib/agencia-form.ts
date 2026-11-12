import { z } from 'zod'

import type { ApiError } from '@/shared/api'
import type { Agencia, Ciudad } from '@/features/catalogos'
import type { AgenciaCreate, AgenciaUpdate, TipoAgencia } from '@/features/organizacion/api/agencias.contract'

/*
 * Formulario de alta (ORG-01) y edición (ORG-02) de una agencia. Mismas reglas que `AgenciaCreate`
 * y `AgenciaUpdate` del backend. Los campos son texto; el esquema arma los valores del body y los
 * opcionales vacíos quedan en `undefined` para no enviarlos (el backend no acepta `null` aquí).
 */

/** Sin caracteres de control: el texto termina en reportes y en la auditoría */
const sinControl = (valor: string) =>
  [...valor].every((caracter) => {
    const codigo = caracter.charCodeAt(0)
    return codigo > 0x1f && codigo !== 0x7f
  })

const opcional = (valido: (valor: string) => boolean, error: string) =>
  z
    .string()
    .trim()
    .refine((valor) => valor === '' || valido(valor), error)
    .transform((valor) => valor || undefined)

const camposAgencia = z.object({
  idAgencia: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]{3}$/, 'Usa exactamente 3 letras o números, p. ej. 001.'),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Ingresa el código.')
    .max(10, 'Usa 10 caracteres como máximo.')
    .regex(/^[A-Z0-9-]+$/, 'Usa solo letras, números y guiones.'),
  tipoAgencia: z
    .string()
    .refine((valor) => valor === 'Matriz' || valor === 'Sucursal', 'Elige el tipo de agencia.')
    .transform((valor) => valor as TipoAgencia),
  /** '' = sin ciudad elegida */
  idCiudad: z
    .string()
    .refine((valor) => valor === '' || /^\d+$/.test(valor), 'Elige una ciudad de la lista.')
    .transform((valor) => (valor ? Number(valor) : undefined)),
  telefono: opcional(
    (valor) => valor.length >= 6 && valor.length <= 15 && /^[0-9+() -]+$/.test(valor),
    'Usa de 6 a 15 caracteres: números, espacios, +, ( ) o -.',
  ),
  direccion: opcional(
    (valor) => valor.length <= 250 && sinControl(valor),
    'Usa 250 caracteres como máximo, sin saltos de línea.',
  ),
})

/** El alta exige ciudad; en la edición puede quedar vacía si no se pudo resolver la actual */
export const crearAgenciaFormSchema = camposAgencia.superRefine((valor, ctx) => {
  if (valor.idCiudad === undefined) ctx.addIssue({ code: 'custom', path: ['idCiudad'], message: 'Elige la ciudad.' })
})

export const editarAgenciaFormSchema = camposAgencia

export type AgenciaFormInput = z.input<typeof camposAgencia>
export type AgenciaFormData = z.output<typeof camposAgencia>
export type CampoAgencia = keyof AgenciaFormInput

export const VALORES_NUEVA: AgenciaFormInput = {
  idAgencia: '',
  codigo: '',
  tipoAgencia: '',
  idCiudad: '',
  telefono: '',
  direccion: '',
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

/**
 * CAT-06 solo trae el nombre de la ciudad y su provincia: se busca su id en el catálogo de
 * ciudades. Sin coincidencia única devuelve null (el select queda vacío y no se envía).
 */
export function resolverIdCiudad(agencia: Pick<Agencia, 'ciudad' | 'provincia'>, ciudades: readonly Ciudad[]) {
  const nombre = normalizar(agencia.ciudad)
  const provincia = normalizar(agencia.provincia)
  const coincidencias = ciudades.filter(
    (ciudad) => normalizar(ciudad.nombre) === nombre && normalizar(ciudad.provincia) === provincia,
  )
  return coincidencias.length === 1 ? coincidencias[0].idCiudad : null
}

/** Teléfono y dirección empiezan vacíos: no hay GET de una agencia y vacío significa «no cambiar» */
export const valoresEdicion = (agencia: Agencia, idCiudad: number | null): AgenciaFormInput => ({
  idAgencia: agencia.idAgencia,
  codigo: agencia.codigo,
  tipoAgencia: agencia.tipoAgencia,
  idCiudad: idCiudad === null ? '' : String(idCiudad),
  telefono: '',
  direccion: '',
})

/** Quita las claves `undefined` para que el body lleve solo lo que se define */
const sinVacios = <T extends object>(objeto: T) =>
  Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as T

/** ORG-01 · El esquema de alta ya garantizó la ciudad */
export function payloadCrear(datos: AgenciaFormData): AgenciaCreate {
  return sinVacios({
    idAgencia: datos.idAgencia,
    codigo: datos.codigo,
    tipoAgencia: datos.tipoAgencia,
    idCiudad: datos.idCiudad ?? 0,
    telefono: datos.telefono,
    direccion: datos.direccion,
  })
}

/**
 * ORG-02 · Solo los campos que cambiaron frente a lo que se precargó. Teléfono y dirección se
 * envían si se escribieron (no se conoce su valor actual). Objeto vacío = no hay nada que enviar.
 */
export function payloadEdicion(inicial: AgenciaFormInput, datos: AgenciaFormData): AgenciaUpdate {
  const idCiudadInicial = inicial.idCiudad ? Number(inicial.idCiudad) : undefined
  return sinVacios({
    codigo: datos.codigo !== inicial.codigo ? datos.codigo : undefined,
    tipoAgencia: datos.tipoAgencia !== inicial.tipoAgencia ? datos.tipoAgencia : undefined,
    idCiudad: datos.idCiudad !== idCiudadInicial ? datos.idCiudad : undefined,
    telefono: datos.telefono,
    direccion: datos.direccion,
  })
}

/** Motivo del cambio de estado: queda en la auditoría */
export const motivoFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Escribe el motivo.')
    .max(300, 'Usa 300 caracteres como máximo.')
    .refine(sinControl, 'Escribe el motivo en una sola línea.'),
})

export type MotivoFormInput = z.input<typeof motivoFormSchema>
export type MotivoFormData = z.output<typeof motivoFormSchema>

/*
 * Errores de ORG-01/ORG-02 por `code`. Los que no están aquí (MATRIZ_NO_DESACTIVABLE,
 * AGENCIA_CON_ACTIVIDAD, que lista lo que sigue activo, y los demás) muestran el mensaje del backend.
 */
const MENSAJES: Record<string, string> = {
  AGENCIA_YA_EXISTE: 'Ya existe una agencia con ese ID. Usa otro.',
  CODIGO_DUPLICADO: 'Ya existe una agencia con ese código.',
  MATRIZ_YA_EXISTE: 'Ya existe una agencia Matriz: solo puede haber una.',
  CIUDAD_NO_ENCONTRADA: 'La ciudad elegida no existe en el catálogo.',
  AGENCIA_NO_ENCONTRADA: 'La agencia ya no existe. Recarga la lista.',
  TRANSICION_INVALIDA: 'Ese cambio de estado no está permitido para esta agencia.',
  CAMBIO_MATRIZ_NO_PERMITIDO: 'La agencia Matriz no puede pasar a Sucursal.',
  DATOS_INVALIDOS: 'Revisa los datos: hay valores que no son válidos.',
}

export function mensajeErrorAgencia(error: ApiError) {
  if (error.status === 403) return 'No tienes permiso para administrar agencias.'
  return MENSAJES[error.code] ?? error.message
}

/** Campo del formulario al que apunta un error del backend, para mostrarlo junto a él */
const CAMPO_DEL_ERROR: Record<string, CampoAgencia> = {
  AGENCIA_YA_EXISTE: 'idAgencia',
  CODIGO_DUPLICADO: 'codigo',
  MATRIZ_YA_EXISTE: 'tipoAgencia',
  CAMBIO_MATRIZ_NO_PERMITIDO: 'tipoAgencia',
  CIUDAD_NO_ENCONTRADA: 'idCiudad',
}

export const campoDelError = (error: ApiError): CampoAgencia | null => CAMPO_DEL_ERROR[error.code] ?? null
