import { ApiError, apiClient } from '@/shared/api'
import { z } from 'zod'
import { APERTURA_ENDPOINT, cuentaAbiertaSchema, type CuentaCreate } from '@/features/cuenta/api/apertura.contract'

const RESPUESTA_INVALIDA = 'No pudimos leer la respuesta del servidor. Revisa en la búsqueda si la cuenta se abrió.'
const habilitacionSchema = z.object({ habilitado: z.boolean(), motivos: z.array(z.string()) })
const autorizadoSchema = z.object({
  idCuentaAutorizado: z.number(),
  idClienteAutorizado: z.number(),
  nombreAutorizado: z.string().nullish(),
  rol: z.enum(['Tutor', 'RepresentanteLegal', 'Firmante']),
  fechaInicio: z.string(),
  fechaFin: z.string().nullable(),
  vigente: z.boolean(),
})
const autorizadosSchema = z.array(autorizadoSchema)
export type RolAutorizado = z.infer<typeof autorizadoSchema>['rol']

export async function consultarHabilitacion(idCliente: number) {
  const { data } = await apiClient.get<unknown>(`/api/v1/clientes/${idCliente}/habilitacion`)
  return habilitacionSchema.parse(data)
}

export async function consultarAutorizados(idCuenta: number) {
  const { data } = await apiClient.get<unknown>(`${APERTURA_ENDPOINT}/${idCuenta}/autorizados`)
  return autorizadosSchema.parse(data)
}

export async function agregarAutorizado(idCuenta: number, idClienteAutorizado: number, rol: RolAutorizado) {
  const { data } = await apiClient.post<unknown>(`${APERTURA_ENDPOINT}/${idCuenta}/autorizados`, { idClienteAutorizado, rol })
  return autorizadoSchema.parse(data)
}

export async function finalizarAutorizado(idCuenta: number, idAut: number) {
  await apiClient.post(`${APERTURA_ENDPOINT}/${idCuenta}/autorizados/${idAut}/fin`)
}

const eventosSchema = z.array(z.object({
  idCuentaEvento: z.number(),
  tipoEvento: z.string(),
  estadoAnterior: z.string().nullable(),
  estadoActual: z.string(),
  detalle: z.string(),
  fechaEvento: z.string(),
}))

export async function consultarEventosCuenta(idCuenta: number) {
  const { data } = await apiClient.get<unknown>(`${APERTURA_ENDPOINT}/${idCuenta}/eventos`)
  return eventosSchema.parse(data)
}

/** CTA-01 · Abre la cuenta; es irreversible, así que nunca se reintenta */
export async function abrirCuenta(body: CuentaCreate) {
  const { data, status } = await apiClient.post<unknown>(APERTURA_ENDPOINT, body)
  const result = cuentaAbiertaSchema.safeParse(data)
  if (!result.success) throw new ApiError(RESPUESTA_INVALIDA, status, 'respuesta_invalida')
  return result.data
}

export async function descargarFormularioApertura(idCuenta: number) {
  const { data, status } = await apiClient.get<Blob>(`${APERTURA_ENDPOINT}/${idCuenta}/formulario-apertura`, {
    responseType: 'blob',
  })
  if (data.type !== 'application/pdf') {
    throw new ApiError('La respuesta no contiene el formulario PDF.', status, 'respuesta_invalida')
  }
  const url = URL.createObjectURL(data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `formulario-apertura-${idCuenta}.pdf`
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function anularApertura(idCuenta: number, motivo: string) {
  const { data } = await apiClient.post<unknown>(`${APERTURA_ENDPOINT}/${idCuenta}/anulacion`, { motivo })
  return cuentaAbiertaSchema.parse(data)
}
