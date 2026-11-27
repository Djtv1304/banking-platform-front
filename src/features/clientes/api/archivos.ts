import { z } from 'zod'

import { CLIENTES_ENDPOINTS } from '@/features/clientes/api/clientes.contract'
import { ApiError, apiClient } from '@/shared/api'

const archivoSchema = z.object({
  idArchivo: z.number().int().positive(),
  claseDocumento: z.string(),
  nombreOriginal: z.string(),
  tipoContenido: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  tamanoBytes: z.number().int().positive(),
  estadoAnalisis: z.enum(['Limpio', 'Pendiente', 'Rechazado']),
  version: z.number().int().positive(),
  reemplazado: z.boolean(),
  idArchivoAnterior: z.number().int().positive().nullable(),
  fechaSubida: z.iso.datetime({ offset: true }),
})

const catalogoSchema = z.object({
  clases: z.array(z.object({
    codigo: z.string(),
    nombre: z.string(),
    obligatorioNatural: z.boolean(),
    obligatorioJuridico: z.boolean(),
  })),
  maxBytes: z.number().int().positive(),
})
const listadoSchema = catalogoSchema.extend({ archivos: z.array(archivoSchema) })

export type ArchivoCliente = z.infer<typeof archivoSchema>
const ruta = (id: number) => `${CLIENTES_ENDPOINTS.detalle(id)}/archivos`

export async function listarArchivos(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(ruta(id), { signal })
  return listadoSchema.parse(data)
}

export async function consultarClasesArchivo(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`${ruta(id)}/clases`, { signal })
  return catalogoSchema.parse(data)
}

export async function subirArchivo(
  id: number,
  archivo: File,
  claseDocumento: string,
  reemplazarIdArchivo: number | undefined,
  progreso: (porcentaje: number) => void,
) {
  const cuerpo = new FormData()
  cuerpo.set('archivo', archivo)
  cuerpo.set('claseDocumento', claseDocumento)
  if (reemplazarIdArchivo !== undefined) cuerpo.set('reemplazarIdArchivo', String(reemplazarIdArchivo))

  const { data } = await apiClient.postForm<unknown>(ruta(id), cuerpo, {
    onUploadProgress: ({ loaded, total }) => {
      if (total) progreso(Math.min(100, Math.round(loaded / total * 100)))
    },
  })
  return archivoSchema.parse(data)
}

export async function leerArchivo(id: number, archivo: ArchivoCliente, signal: AbortSignal) {
  const { data, headers } = await apiClient.get<Blob>(`${ruta(id)}/${archivo.idArchivo}/contenido`, {
    responseType: 'blob',
    signal,
  })
  const nombre = /^attachment; filename="([A-Za-z0-9._-]+)"$/.exec(String(headers['content-disposition'] ?? ''))?.[1]
  if (!(data instanceof Blob) || data.type !== archivo.tipoContenido || !nombre) {
    throw new ApiError('No pudimos leer la respuesta del archivo.', 200, 'respuesta_invalida')
  }
  return { blob: data, nombre }
}
