import { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'

const ruta = '/api/v1/contabilidad/cuentas/importaciones'
export const MAX_ID_IMPORTACION = 2_147_483_647
export const MAX_BYTES_CSV = 2 * 1024 * 1024
const contador = z.number().int().nonnegative()

const revisionSchema = z.object({
  numeroFila: z.number().int().positive(),
  CodigoCuenta: z.string(),
  NombreCuenta: z.string(),
  CodigoCuentaSuperior: z.string(),
  Naturaleza: z.string(),
  resultado: z.enum(['Nueva', 'Cambiada', 'Igual', 'Error']),
  codigoError: z.string().nullable(),
  anterior: z.object({
    nombre: z.string(),
    naturaleza: z.string(),
    padre: z.string().nullable(),
    regulador: z.boolean(),
    imputable: z.boolean(),
  }).nullable(),
})

const importacionSchema = z.object({
  IdImportacion: z.number().int().positive().max(MAX_ID_IMPORTACION),
  NombreArchivo: z.string(),
  FilasError: contador,
  FilasNuevas: contador,
  FilasCambiadas: contador,
  FilasIguales: contador,
  estado: z.enum(['Revision', 'Aplicada']),
  AplicadoPor: z.number().int().nullable(),
  FechaAplicada: z.string().nullable(),
  revision: z.array(revisionSchema),
})

export type ImportacionCatalogo = z.infer<typeof importacionSchema>

function leerImportacion(data: unknown, status: number, estado?: ImportacionCatalogo['estado']) {
  const resultado = importacionSchema.safeParse(data)
  if (!resultado.success || (estado && resultado.data.estado !== estado)) {
    throw new ApiError('No pudimos leer la importación devuelta por el servidor.', status, 'respuesta_invalida')
  }
  return resultado.data
}

export async function consultarImportacion(id: number) {
  const { data, status } = await apiClient.get<unknown>(`${ruta}/${id}`)
  return leerImportacion(data, status)
}

export async function prepararImportacion(archivo: File) {
  const { data, status } = await apiClient.post<unknown>(ruta, archivo, {
    headers: { 'Content-Type': 'text/csv', 'X-Nombre-Archivo': archivo.name },
  })
  return leerImportacion(data, status, 'Revision')
}

export async function aplicarImportacion(id: number) {
  const { data, status } = await apiClient.post<unknown>(`${ruta}/${id}/aplicar`)
  return leerImportacion(data, status, 'Aplicada')
}
