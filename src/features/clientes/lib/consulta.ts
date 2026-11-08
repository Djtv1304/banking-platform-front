import type {
  Cliente,
  ClienteResumen,
  EstadoCliente,
  ParametrosBusqueda,
  TipoCliente,
} from '@/features/clientes/api/clientes.contract'
import { CELULAR_PREFIJO, formatearCelular, normalizarCelular } from '@/features/clientes/lib/celular'

/* Lógica pura de la consulta de clientes (C-03): sin React ni red, para probarla aislada. */

export const PAGE_SIZE = 20

export const Q_MAX = 100

/** Lista blanca de órdenes que ofrece la pantalla (todos son campos permitidos por CLI-03) */
export const ORDENES = [
  { value: 'fechaRegistro,desc', label: 'Más recientes' },
  { value: 'apellidos,asc', label: 'Apellidos A-Z' },
  { value: 'razonSocial,asc', label: 'Razón social A-Z' },
] as const satisfies readonly { value: NonNullable<ParametrosBusqueda['sort']>; label: string }[]

export type Orden = (typeof ORDENES)[number]['value']

/** Lo que el asesor escribe en los filtros; `''` = sin filtro */
export interface FiltrosClientes {
  q: string
  identificacion: string
  tipoCliente: TipoCliente | ''
  estado: EstadoCliente | ''
  sort: Orden
}

export const FILTROS_INICIALES: FiltrosClientes = {
  q: '',
  identificacion: '',
  tipoCliente: '',
  estado: '',
  sort: 'fechaRegistro,desc',
}

export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  Natural: 'Persona natural',
  Juridico: 'Persona jurídica',
}

export const TIPO_DOCUMENTO_LABEL: Record<Cliente['tipoDocumento'], string> = {
  C: 'Cédula',
  R: 'RUC',
  P: 'Pasaporte',
}

const VARIANTE_ESTADO: Partial<Record<string, 'default' | 'destructive'>> = {
  Activo: 'default',
  Bloqueado: 'destructive',
  Suspendido: 'destructive',
  Eliminado: 'destructive',
}

/** Variante del Badge del estado: Activo resalta, los que impiden operar en rojo, el resto neutro */
export const varianteEstado = (estado: string) => VARIANTE_ESTADO[estado] ?? 'secondary'

/** Parámetros de CLI-03 sin los filtros vacíos: el texto va recortado y con 100 caracteres como máximo */
export function armarParametros(filtros: FiltrosClientes, page: number): ParametrosBusqueda {
  const params: ParametrosBusqueda = {
    page: Math.max(1, Math.trunc(page) || 1),
    pageSize: PAGE_SIZE,
    sort: filtros.sort,
  }
  const q = filtros.q.trim().slice(0, Q_MAX).trimEnd()
  const identificacion = filtros.identificacion.trim()
  if (q) params.q = q
  if (identificacion) params.identificacion = identificacion
  if (filtros.tipoCliente) params.tipoCliente = filtros.tipoCliente
  if (filtros.estado) params.estado = filtros.estado
  return params
}

/** Persona jurídica: razón social. Persona natural (o jurídica sin razón social): nombres y apellidos */
export function nombreVisible(cliente: Pick<ClienteResumen, 'tipoCliente' | 'nombres' | 'apellidos' | 'razonSocial'>) {
  const razonSocial = cliente.razonSocial?.trim()
  if (cliente.tipoCliente === 'Juridico' && razonSocial) return razonSocial
  return [cliente.nombres, cliente.apellidos]
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(' ')
}

/** `ceil(total / pageSize)`, con al menos una página para que «Página 1 de 1» tenga sentido */
export function totalPaginas(total: number, pageSize: number) {
  if (pageSize <= 0) return 1
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Máximo de una columna INT de SQL Server: un ID mayor no puede existir */
const ID_MAXIMO = 2_147_483_647

/** El `:idCliente` de la URL como número, o `undefined` si no es un ID válido (no se llama a la API) */
export function parsearIdCliente(valor: string | undefined) {
  if (!valor || !/^[1-9]\d*$/.test(valor)) return undefined
  const id = Number(valor)
  return id <= ID_MAXIMO ? id : undefined
}

/** Celular ecuatoriano (`+593987654321` o `0987654321`) → `+593 98 765 4321`; otro formato, tal cual */
export function celularVisible(telefono: string) {
  const limpio = telefono.replace(/[\s-]/g, '')
  if (!/^(\+?593|0)9\d{8}$/.test(limpio)) return telefono
  return `${CELULAR_PREFIJO} ${formatearCelular(normalizarCelular(limpio))}`
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' })

/** `YYYY-MM-DD` (o un datetime ISO) → «12 de mayo de 1990»; si no se puede leer, el texto original */
export function formatearFecha(valor: string) {
  const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? valor : FORMATO_FECHA.format(fecha)
}
