import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'
import { solicitudSchema } from '@/features/aprobaciones/api/aprobaciones.contract'
import { CONTABILIDAD_ENDPOINTS, cuentaContableSchema } from '@/features/contabilidad/api/contabilidad.contract'

const base = '/api/v1/contabilidad'
const lado = z.enum(['DEBITO', 'CREDITO'])
const origen = z.enum(['FIJA', 'PRODUCTO', 'CONTRAPRODUCTO', 'COMISION'])
const componente = z.enum(['PRINCIPAL', 'COMISION', 'IMPUESTO', 'INTERES', 'MORA', 'SEGURO', 'DIFERENCIA', 'TOTAL'])
const id = z.number().int().positive().max(2_147_483_647)
export const opcionesLinea = { lado: lado.options, origen: origen.options, base: componente.options }
const plantilla = z.object({
  IdPlantillaAsiento: id, CodigoPlantilla: z.string(), Version: z.number().int(), Nombre: z.string(),
  VigenciaDesde: z.iso.date(), VigenciaHasta: z.iso.date().nullable(), Estado: z.boolean(),
  Origen: z.string(), IdTipoAsiento: id, IdConceptoContable: id,
  CodigoTipoAsiento: z.string().nullable(), NombreTipoAsiento: z.string().nullable(),
  CodigoConcepto: z.string().nullable(), ConceptoDetalle: z.string().nullable(),
})
const detalle = plantilla.extend({ lineas: z.array(z.object({
  TipoMovimiento: lado, OrigenCuenta: origen, ComponenteImporte: componente,
  IdCuentaContable: id.nullable(), CodigoRol: z.string().nullable(),
  Orden: id, CodigoCuenta: z.string().nullable(), NombreCuenta: z.string().nullable(),
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
// FastAPI puede serializar Decimal como texto. Solo se normaliza para presentación;
// el cálculo contable continúa en backend con Decimal.
const importe = z.union([z.number(), z.string().regex(/^-?\d+(?:\.\d+)?$/)])
  .transform(Number).pipe(z.number().finite())
const simulacion = z.object({ total: importe, lineas: z.array(z.object({ cuenta: id, lado, monto: importe })) })

export interface FiltrosPlantillas {
  q?: string
  codigo?: string
  estado?: 0 | 1
  origen?: string
  idTipoAsiento?: number
}
export type ResumenPlantilla = z.infer<typeof plantilla>
export type PlantillaDetallada = z.infer<typeof detalle>

const catalogos = z.object({
  tiposAsiento: z.array(z.object({ IdTipoAsiento: id, Nombre: z.string() })),
  conceptosContables: z.array(z.object({ IdConceptoContable: id, ConceptoDetalle: z.string().nullable() })),
})
const resumenSolicitud = solicitudSchema.pick({
  idSolicitud: true, estado: true, puedeAprobar: true, puedeRechazar: true, puedeCancelar: true,
}).nullable()
const creada = z.object({ idPlantillaAsiento: id, idSolicitud: z.number().int().positive() })

export async function listarPlantillas(params: FiltrosPlantillas, signal?: AbortSignal) {
  return plantilla.array().parse((await apiClient.get(`${base}/plantillas`, { params, signal })).data)
}

export async function consultarCatalogosPlantillas(signal?: AbortSignal) {
  return catalogos.parse((await apiClient.get(`${base}/plantillas/catalogos`, { signal })).data)
}

export async function consultarAuxiliares(signal?: AbortSignal) {
  const { data } = await apiClient.get(CONTABILIDAD_ENDPOINTS.cuentas, { params: { imputable: true }, signal })
  return cuentaContableSchema.array().parse(data)
    .filter((cuenta) => cuenta.estado === 'Activo' && cuenta.esImputable && /^\d{8}$/.test(cuenta.codigoCuenta))
}

export async function consultarSolicitudPlantilla(idPlantilla: number, signal?: AbortSignal) {
  return resumenSolicitud.parse((await apiClient.get(`${base}/plantillas/${idPlantilla}/solicitudes`, { signal })).data)
}

export async function consultarPlantilla(idPlantilla: number, signal?: AbortSignal) {
  return detalle.parse((await apiClient.get(`${base}/plantillas/${idPlantilla}`, { signal })).data)
}

export async function crearVersion(tipo: number, entrada: Version) {
  const { status, data } = await apiClient.post(`${base}/tipos-asiento/${tipo}/plantillas`, entrada)
  if (status !== 202) throw new ApiError('El servidor no confirmó la nueva versión pendiente.', status, 'RESPUESTA_PLANTILLA_INVALIDA')
  return creada.parse(data)
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
