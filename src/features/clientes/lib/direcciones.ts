import { z } from 'zod'
import { hasPermission, PERMISOS } from '@/shared/lib'
import {
  tipoDireccionSchema, type DireccionGestion, type DireccionNueva, type DireccionCambio,
} from '@/features/clientes/api/direcciones.contract'

/** Agregar, editar o quitar direcciones exige clientes:editar */
export function puedeGestionarDirecciones(permisos: readonly string[]) {
  return hasPermission(permisos, PERMISOS.clientesEditar)
}

export const direccionFormSchema = z.object({
  tipoDireccion: tipoDireccionSchema,
  codigoPais: z.string().regex(/^[A-Z]{3}$/, 'Selecciona un país'),
  idCiudad: z.string().regex(/^[1-9]\d*$/, 'Selecciona una ciudad'),
  sector: z.string().trim().max(50, 'Máximo 50 caracteres'),
  calleDireccion: z.string().trim().min(1, 'Ingresa la calle y número').max(250, 'Máximo 250 caracteres'),
  referenciaUbicacion: z.string().trim().min(1, 'Ingresa una referencia').max(250, 'Máximo 250 caracteres'),
  codigoPostal: z.string().trim().regex(/^(\d{6})?$/, 'El contrato actual admite seis dígitos o dejarlo vacío'),
  esPrincipal: z.boolean(),
})

export type DireccionForm = z.infer<typeof direccionFormSchema>

export function valoresDireccion(direccion?: DireccionGestion): DireccionForm {
  return {
    tipoDireccion: direccion?.tipoDireccion ?? 'Domicilio', codigoPais: direccion?.codigoPais ?? 'ECU',
    idCiudad: direccion ? String(direccion.idCiudad) : '', sector: direccion?.sector ?? '',
    calleDireccion: direccion?.calleDireccion ?? '', referenciaUbicacion: direccion?.referenciaUbicacion ?? '',
    codigoPostal: direccion?.codigoPostal ?? '', esPrincipal: direccion?.esPrincipal ?? false,
  }
}

export function payloadDireccion(form: DireccionForm): DireccionNueva {
  return {
    ...form, idCiudad: Number(form.idCiudad), sector: form.sector || null, codigoPostal: form.codigoPostal || null,
  }
}

export function cambiosDireccion(actual: DireccionGestion, nuevo: DireccionNueva): DireccionCambio {
  return Object.fromEntries(Object.entries(nuevo).filter(([campo, valor]) => actual[campo as keyof DireccionGestion] !== valor))
}

export function accionesDireccion(direccion: DireccionGestion) {
  const activa = direccion.estado === 'Activo'
  return { editar: activa, principal: activa && !direccion.esPrincipal, baja: activa && !direccion.esPrincipal }
}
