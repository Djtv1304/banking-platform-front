import { z } from 'zod'

import type { ApiError } from '@/shared/api'
import type { AgenciaCreate, AgenciaDetalle, AgenciaUpdate, TipoAgencia } from '@/features/organizacion/api/agencias.contract'

/*
 * Formulario de alta (ORG-01) y edición (ORG-02) de una agencia. Mismas reglas que `AgenciaCreate`
 * y `AgenciaUpdate` del backend. Los campos son texto; el esquema arma los valores del body y los
 * opcionales vacíos quedan en `undefined` (en el alta no se envían; en la edición, ver `payloadEdicion`).
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

/** La ciudad es obligatoria en el alta y en la edición (el back no admite quitarla) */
export const agenciaFormSchema = camposAgencia.superRefine((valor, ctx) => {
  if (valor.idCiudad === undefined) ctx.addIssue({ code: 'custom', path: ['idCiudad'], message: 'Elige la ciudad.' })
})

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

/** ORG-02 · Se precarga lo que devuelve GET /agencias/{id}; el ID no se edita */
export const valoresEdicion = (agencia: AgenciaDetalle): AgenciaFormInput => ({
  idAgencia: agencia.idAgencia,
  codigo: agencia.codigo,
  tipoAgencia: agencia.tipoAgencia,
  idCiudad: String(agencia.idCiudad),
  telefono: agencia.telefono ?? '',
  direccion: agencia.direccion ?? '',
})

/** Quita las claves `undefined` para que el body lleve solo lo que se define */
const sinVacios = <T extends object>(objeto: T) =>
  Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as T

/** ORG-01 · El esquema ya garantizó la ciudad */
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

/** Opcional que cambió: el texto nuevo, o `null` si se vació (el back lo borra) */
const opcionalCambiado = (inicial: string, nuevo: string | undefined) =>
  (nuevo ?? '') === inicial.trim() ? undefined : (nuevo ?? null)

/**
 * ORG-02 · Solo los campos que cambiaron frente a lo que se precargó. Objeto vacío = no hay nada
 * que enviar. Teléfono o dirección vaciados van como `null`; los obligatorios nunca.
 */
export function payloadEdicion(inicial: AgenciaFormInput, datos: AgenciaFormData): AgenciaUpdate {
  return sinVacios({
    codigo: datos.codigo !== inicial.codigo ? datos.codigo : undefined,
    tipoAgencia: datos.tipoAgencia !== inicial.tipoAgencia ? datos.tipoAgencia : undefined,
    idCiudad: datos.idCiudad !== Number(inicial.idCiudad) ? datos.idCiudad : undefined,
    telefono: opcionalCambiado(inicial.telefono, datos.telefono),
    direccion: opcionalCambiado(inicial.direccion, datos.direccion),
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
