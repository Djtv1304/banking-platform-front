import { z } from 'zod'

import {
  ESTADOS_USUARIO,
  ID_AGENCIA_REGEX,
  ROLES_USUARIO,
  type CampoOrden,
} from '@/features/usuarios/api/usuarios.contract'

/*
 * Lo que la pantalla le pide a AUT-05: búsqueda, filtros, orden y página. Los datos personales
 * viven en memoria para que no queden en el historial ni en los logs. Solo el código público
 * del rol puede llegar por URL desde la vista de Roles y accesos.
 */

export const PAGE_SIZE = 20

/** Máximo de `q` en AUT-05 */
export const BUSQUEDA_MAX_LENGTH = 100

/** Todos son opcionales y se combinan; vacío = sin filtro */
export const filtrosUsuariosSchema = z.object({
  q: z.string().trim().max(BUSQUEDA_MAX_LENGTH, `Usa hasta ${BUSQUEDA_MAX_LENGTH} caracteres.`),
  nombre: z.string().trim().max(BUSQUEDA_MAX_LENGTH),
  idUsuario: z.string().trim().refine(valor => !valor || leerIdUsuario(valor) !== null, 'Ingresa un ID de usuario válido.'),
  estado: z.union([z.literal(''), z.enum(ESTADOS_USUARIO)]),
  rol: z.union([z.literal(''), z.enum(ROLES_USUARIO)]),
  idAgencia: z.union([z.literal(''), z.string().regex(ID_AGENCIA_REGEX)]),
  vinculado: z.enum(['', 'true', 'false']),
})

export type FiltrosUsuariosInput = z.input<typeof filtrosUsuariosSchema>
export type FiltrosUsuarios = z.output<typeof filtrosUsuariosSchema>

export const FILTROS_VACIOS: FiltrosUsuarios = { q: '', nombre: '', idUsuario: '', estado: '', rol: '', idAgencia: '', vinculado: '' }

/** Solo un código de rol público puede precargar el filtro desde la vista de roles. */
export function filtrosDesdeRol(rol: string | null): FiltrosUsuarios {
  const valido = (ROLES_USUARIO as readonly string[]).includes(rol ?? '')
  return { ...FILTROS_VACIOS, rol: valido ? rol as FiltrosUsuarios['rol'] : '' }
}

export interface Orden {
  campo: CampoOrden
  direccion: 'asc' | 'desc'
}

/** El de AUT-05 cuando no se envía `sort` */
export const ORDEN_INICIAL: Orden = { campo: 'fechaCreacion', direccion: 'desc' }

/**
 * Clic en una columna: si ya ordena por ella invierte la dirección; si no, empieza en A→Z
 * (o en «más recientes» para la fecha de creación).
 */
export function siguienteOrden(actual: Orden, campo: CampoOrden): Orden {
  if (actual.campo === campo) return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
  return { campo, direccion: campo === 'fechaCreacion' ? 'desc' : 'asc' }
}

/** Parámetros de AUT-05 sin filtros vacíos; el orden por defecto no se envía */
export function armarParametros(filtros: FiltrosUsuarios, orden: Orden, page: number) {
  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) }
  const q = filtros.q.trim()
  if (q) params.q = q
  if (filtros.nombre) params.nombre = filtros.nombre
  if (filtros.idUsuario) params.idUsuario = filtros.idUsuario
  if (filtros.estado) params.estado = filtros.estado
  if (filtros.rol) params.rol = filtros.rol
  if (filtros.idAgencia) params.idAgencia = filtros.idAgencia
  if (filtros.vinculado) params.vinculado = filtros.vinculado
  if (orden.campo !== ORDEN_INICIAL.campo || orden.direccion !== ORDEN_INICIAL.direccion) {
    params.sort = `${orden.campo},${orden.direccion}`
  }
  return params
}

/** Cuántos filtros (sin contar la búsqueda) están aplicados */
export const filtrosActivos = (filtros: FiltrosUsuarios) =>
  [filtros.nombre, filtros.idUsuario, filtros.estado, filtros.rol, filtros.idAgencia, filtros.vinculado].filter(Boolean).length

export const totalPaginas = (total: number, pageSize = PAGE_SIZE) => Math.max(1, Math.ceil(total / pageSize))

/** «Página 2 de 3 · 45 usuarios» */
export const resumenPaginacion = (page: number, total: number, pageSize = PAGE_SIZE) =>
  `Página ${page} de ${totalPaginas(total, pageSize)} · ${total} ${total === 1 ? 'usuario' : 'usuarios'}`

/** Mayor valor de una columna INT de SQL Server */
const INT_MAX = 2_147_483_647

/** `idUsuario` de la URL: entero positivo que cabe en INT, o `null` si no es válido (no se llama a la API) */
export function leerIdUsuario(valor: string | undefined) {
  if (!valor || !/^\d+$/.test(valor)) return null
  const idUsuario = Number(valor)
  return idUsuario >= 1 && idUsuario <= INT_MAX ? idUsuario : null
}
