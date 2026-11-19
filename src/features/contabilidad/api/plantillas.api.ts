import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'

const base = '/api/v1/contabilidad'
const lado = z.enum(['DEBITO', 'CREDITO'])
const origen = z.enum(['FIJA', 'PRODUCTO', 'CONTRAPRODUCTO', 'COMISION'])
const componente = z.enum(['PRINCIPAL', 'COMISION', 'IMPUESTO', 'INTERES', 'MORA', 'SEGURO', 'DIFERENCIA', 'TOTAL'])
const id = z.number().int().positive()
export const opcionesLinea = { lado: lado.options, origen: origen.options, base: componente.options }
const plantilla = z.object({
  IdPlantillaAsiento: id, CodigoPlantilla: z.string(), Version: z.number().int(), Nombre: z.string(),
  VigenciaDesde: z.iso.date(), VigenciaHasta: z.iso.date().nullable(), Estado: z.boolean(),
})
const detalle = plantilla.extend({ lineas: z.array(z.object({
  TipoMovimiento: lado, OrigenCuenta: origen, ComponenteImporte: componente,
  IdCuentaContable: id.nullable(), CodigoRol: z.string().nullable(),
})) })
export type LineaPlantilla = {
  lado: z.infer<typeof lado>; origen: z.infer<typeof origen>; base: z.infer<typeof componente>
  cuenta: number | null; rol: string | null
}
type Version = { codigoPlantilla: string; nombre: string; vigenciaDesde: string; lineas: LineaPlantilla[] }
type Simulacion = {
  lineas: LineaPlantilla[]; montos: Record<string, string>; producto: Record<string, number>;
  contraproducto: Record<string, number>; comision: number | null
}
const simulacion = z.object({ total: z.number(), lineas: z.array(z.object({ cuenta: id, lado, monto: z.number() })) })

export async function listarPlantillas(tipo: number, signal?: AbortSignal) {
  return plantilla.array().parse((await apiClient.get(`${base}/tipos-asiento/${tipo}/plantillas`, { signal })).data)
}

export async function consultarPlantilla(idPlantilla: number, signal?: AbortSignal) {
  return detalle.parse((await apiClient.get(`${base}/plantillas/${idPlantilla}`, { signal })).data)
}

export async function crearVersion(tipo: number, entrada: Version) {
  const { status, data } = await apiClient.post(`${base}/tipos-asiento/${tipo}/plantillas`, entrada)
  if (status !== 202) throw new ApiError('El servidor no confirmó la nueva versión pendiente.', status, 'RESPUESTA_PLANTILLA_INVALIDA')
  return z.object({ idPlantillaAsiento: id }).parse(data)
}

export async function simularPlantilla(entrada: Simulacion) {
  return simulacion.parse((await apiClient.post(`${base}/plantillas/simulaciones`, entrada)).data)
}

export function prepararLineas(plantilla: z.infer<typeof detalle>): LineaPlantilla[] {
  return plantilla.lineas.map(linea => ({
    lado: linea.TipoMovimiento, origen: linea.OrigenCuenta, base: linea.ComponenteImporte,
    cuenta: linea.IdCuentaContable, rol: linea.CodigoRol,
  }))
}
