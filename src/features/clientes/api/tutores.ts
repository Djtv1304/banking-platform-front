import { z } from 'zod'
import { apiClient } from '@/shared/api'
import { CLIENTES_ENDPOINTS } from '@/features/clientes/api/clientes.contract'

const tutorSchema = z.object({
  idRelacion: z.number(),
  nombre: z.string(),
  fechaInicio: z.iso.date(),
  fechaFin: z.iso.date().nullable(),
  tipoRespaldoAlta: z.string().nullable(),
  respaldoAlta: z.string().nullable(),
  tipoRespaldoFin: z.string().nullable(),
  respaldoFin: z.string().nullable(),
  creadoPor: z.number().nullable(),
  fechaCreacion: z.string(),
  finalizadoPor: z.number().nullable(),
  finalizadoEn: z.string().nullable(),
})
const historialSchema = z.object({
  admiteTutor: z.boolean(),
  idVigente: z.number().nullable(),
  historial: z.array(tutorSchema),
})
export type Tutor = z.infer<typeof tutorSchema>
export type AltaTutor = {
  idClienteRelacionado: number
  fechaEfectiva: string
  tipoRespaldo: string
  referenciaRespaldo: string
}

const ruta = (id: number) => `${CLIENTES_ENDPOINTS.detalle(id)}/relaciones/tutor`

export async function consultarTutor(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(ruta(id), { signal })
  return historialSchema.parse(data)
}

export async function guardarTutor(id: number, datos: AltaTutor, anterior: number | null) {
  if (anterior === null) {
    await apiClient.post(ruta(id), datos)
  } else {
    await apiClient.post(`${ruta(id)}/relevo`, { ...datos, idRelacionAnterior: anterior })
  }
}
