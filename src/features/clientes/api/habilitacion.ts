import { z } from 'zod'

import { ApiError, apiClient } from '@/shared/api'

/** GET /clientes/{id}/habilitacion · si el cliente puede recibir productos y, si no, por qué */
const habilitacionSchema = z.object({ habilitado: z.boolean(), motivos: z.array(z.string()) })
export type Habilitacion = z.infer<typeof habilitacionSchema>

export const habilitacionKey = (idCliente: number) => ['clientes', 'habilitacion', idCliente] as const

export async function consultarHabilitacion(idCliente: number, signal?: AbortSignal) {
  const { data, status } = await apiClient.get<unknown>(`/api/v1/clientes/${idCliente}/habilitacion`, { signal })
  const resultado = habilitacionSchema.safeParse(data)
  if (!resultado.success) throw new ApiError('No pudimos leer la respuesta del servidor.', status, 'respuesta_invalida')
  return resultado.data
}

/** Código del backend → texto para el personal; `null` si es informativo y no se muestra */
export function motivoHabilitacion(codigo: string): string | null {
  switch (codigo) {
    case 'ARCHIVOS_NO_EXIGIDOS': return null
    case 'CLIENTE_NO_ACTIVO': return 'El cliente debe estar activo.'
    case 'CONSENTIMIENTO_NO_VIGENTE': return 'Falta un consentimiento vigente.'
    case 'RIESGO_NO_APROBADO_VIGENTE': return 'Falta una evaluación de riesgo aprobada y vigente.'
    case 'FECHA_NACIMIENTO_PENDIENTE': return 'Falta la fecha de nacimiento para verificar si el cliente requiere tutor.'
    case 'TUTOR_VIGENTE_REQUERIDO': return 'El menor necesita un tutor vigente.'
    case 'ARCHIVO_OBLIGATORIO_FALTANTE:PASAPORTE_DATOS': return 'Falta la página de datos del pasaporte.'
    case 'ARCHIVO_OBLIGATORIO_FALTANTE:RESPALDO_TUTOR': return 'Falta el respaldo digital aprobado del tutor vigente.'
    default: return codigo.startsWith('ARCHIVO_OBLIGATORIO_FALTANTE:')
      ? `Falta el archivo obligatorio ${codigo.split(':')[1]}.`
      : 'Hay un requisito pendiente; revísalo con un supervisor.'
  }
}
