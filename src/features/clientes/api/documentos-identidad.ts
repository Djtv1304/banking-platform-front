import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient, aceptadaSchema } from '@/shared/api'

export const RUTA_TIPOS = '/api/v1/catalogos/tipos-documento'
const ruta = (id: number) => '/api/v1/clientes/' + id + '/documentos'

const reglaSchema = z.object({
  codigo: z.string(), nombre: z.string(), algoritmo: z.enum(['EC_CEDULA', 'EC_RUC', 'NINGUNO']),
  patronCaracteres: z.enum(['DIGITOS', 'ALFANUMERICO']), longitudMinima: z.number(),
  longitudMaxima: z.number(), aplicaNatural: z.boolean(), aplicaJuridico: z.boolean(),
  digitoVerificadorBloquea: z.boolean(), requierePais: z.boolean(), requiereVencimiento: z.boolean(), permitePrincipal: z.boolean(),
  accionAlVencer: z.enum(['Avisar', 'Suspender']), activo: z.boolean(), version: z.string(),
})

const fichaDocumentoSchema = z.object({
  idDocumento: z.number(), tipoDocumento: z.string(), nombreTipo: z.string(), numero: z.string(),
  codigoPaisEmision: z.string().nullable(), fechaEmision: z.string().nullable(),
  fechaVencimiento: z.string().nullable(), principal: z.boolean(), tipoActivo: z.boolean(),
  permitePrincipal: z.boolean(), estado: z.string(), version: z.string(),
})

export type TipoIdentidad = z.infer<typeof reglaSchema>
export type DocumentoFicha = z.infer<typeof fichaDocumentoSchema>

const CATALOGO: Record<string, string> = { CEDULA: 'CED', PASAPORTE: 'PAS' }
const CLIENTE: Record<string, string> = { CED: 'C', RUC: 'R', PAS: 'P' }
export const codigoCatalogo = (tipo: string) => CATALOGO[tipo] ?? tipo
export const codigoCliente = (tipo: string) => CLIENTE[tipo] ?? tipo

export const useTiposIdentidad = () => useQuery({
  queryKey: ['catalogos', 'tipos-documento'],
  queryFn: async ({ signal }) => z.array(reglaSchema).parse((await apiClient.get(RUTA_TIPOS, { signal })).data),
})

export async function comprobarDocumento(documento: {
  tipoDocumento: string; numero: string; codigoPaisEmision?: string
}) {
  const { data } = await apiClient.post('/api/v1/clientes/validaciones/documento', documento)
  return z.object({
    reincorporable: z.boolean().default(false), valida: z.boolean(), existe: z.boolean(), idCliente: z.number().nullable(),
    mensaje: z.string(), tipoCoincidencia: z.enum(['EXACTA', 'EQUIVALENCIA']).nullable(),
    estadoDocumento: z.string().nullable(), advertencias: z.array(z.string()).default([]),
  }).parse(data)
}

export const useDocumentosCliente = (id: number) => useQuery({
  queryKey: ['clientes', id, 'documentos'],
  queryFn: async ({ signal }) => z.array(fichaDocumentoSchema).parse((await apiClient.get(ruta(id), { signal })).data),
})

export async function agregarDocumento(id: number, datos: Record<string, unknown>) {
  return fichaDocumentoSchema.parse((await apiClient.post(ruta(id), datos)).data)
}

export async function cambiarDocumento(id: number, documento: number, datos: Record<string, unknown>) {
  return fichaDocumentoSchema.parse((await apiClient.patch(ruta(id) + '/' + documento, datos)).data)
}

export async function solicitarPrincipal(id: number, documento: number, datos: Record<string, unknown>) {
  return aceptadaSchema.parse((await apiClient.put(ruta(id) + '/' + documento + '/principal', datos)).data)
}

export async function solicitarTipo(datos: Omit<TipoIdentidad, 'version'> & { motivo: string; version?: string }) {
  const { codigo, ...cambio } = datos
  const respuesta = cambio.version
    ? await apiClient.patch(RUTA_TIPOS + '/' + codigo, cambio)
    : await apiClient.post(RUTA_TIPOS, datos)
  return aceptadaSchema.parse(respuesta.data)
}
