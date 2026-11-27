import { ApiError, apiClient } from '@/shared/api'
import { descargarCsv } from '@/shared/lib'
import {
  detalleEventoSchema,
  paginaEventosSchema,
  tiposEventoSchema,
  type FiltrosBusqueda,
  type FiltrosExportacion,
} from '@/features/auditoria/api/auditoria.contract'

const BASE = '/api/v1/auditoria'

/** POST /eventos/busqueda — filtros siempre en el body (ASVS 14.2.1) */
export async function buscarEventos(filtros: FiltrosBusqueda) {
  const { data } = await apiClient.post(`${BASE}/eventos/busqueda`, filtros)
  return paginaEventosSchema.parse(data)
}

/** GET /eventos/{idEvento} — detalle con cambios, aprobación y relacionados */
export async function obtenerEvento(idEvento: number) {
  const { data } = await apiClient.get(`${BASE}/eventos/${idEvento}`)
  const evento = detalleEventoSchema.parse(data)
  if (evento.id !== idEvento) throw new ApiError('La respuesta corresponde a otro evento.', 200, 'RESPUESTA_AUDITORIA_INVALIDA')
  return evento
}

/** GET /tipos-evento — alimenta los selects de módulo y tipo de evento */
export async function obtenerTiposEvento() {
  const { data } = await apiClient.get(`${BASE}/tipos-evento`)
  return tiposEventoSchema.parse(data)
}

/** GET /objetivos/{tipo}/{id}/eventos — historial de un objetivo concreto */
export async function obtenerEventosObjetivo(tipo: string, id: string | number, page: number, pageSize: number) {
  const { data } = await apiClient.get(
    `${BASE}/objetivos/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/eventos`,
    { params: { page, pageSize } },
  )
  return paginaEventosSchema.parse(data)
}

/** POST /eventos/exportacion — descarga CSV o PDF */
export async function exportarEventos(filtros: FiltrosExportacion) {
  if (filtros.formato === 'csv') {
    const { data } = await apiClient.post<string>(`${BASE}/eventos/exportacion`, filtros, {
      responseType: 'text',
    })
    descargarCsv(`auditoria-${filtros.desde}-${filtros.hasta}.csv`, data)
    return
  }
  // PDF
  const { data, status } = await apiClient.post<Blob>(`${BASE}/eventos/exportacion`, filtros, {
    responseType: 'blob',
  })
  if (data.type !== 'application/pdf') {
    throw new ApiError('La respuesta no contiene el archivo PDF.', status, 'RESPUESTA_AUDITORIA_INVALIDA')
  }
  const url = URL.createObjectURL(data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `auditoria-${filtros.desde}-${filtros.hasta}.pdf`
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
