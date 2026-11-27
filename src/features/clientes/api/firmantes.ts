import { z } from 'zod'
import { apiClient } from '@/shared/api'
import { CLIENTES_ENDPOINTS } from '@/features/clientes/api/clientes.contract'

const firmanteSchema = z.object({
  idRelacion: z.number(), idClienteRelacionado: z.number(), nombre: z.string(),
  alcance: z.string().nullable(), respaldoAlta: z.string().nullable(),
  fechaInicio: z.iso.date(), fechaFin: z.iso.date().nullable(), respaldoFin: z.string().nullable(),
})
export type Firmante = z.infer<typeof firmanteSchema>
export type AltaFirmante = { idClienteRelacionado: number; alcance: string; fechaInicio: string; respaldo: string }
const ruta = (id: number) => `${CLIENTES_ENDPOINTS.detalle(id)}/relaciones/firmantes`

export async function listarFirmantes(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(ruta(id), { signal })
  return z.array(firmanteSchema).parse(data)
}
export async function agregarFirmante(id: number, datos: AltaFirmante) {
  await apiClient.post(ruta(id), datos)
}
export async function finalizarFirmante(id: number, relacion: number, fechaFin: string, respaldo: string) {
  await apiClient.post(`${ruta(id)}/${relacion}/fin`, { fechaFin, respaldo })
}
