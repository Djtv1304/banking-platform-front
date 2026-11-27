import { z } from 'zod'

import type { FiltrosBusqueda } from '@/features/auditoria/api/auditoria.contract'

const opcional = (patron: RegExp, mensaje: string) => z.string().trim().refine((v) => v === '' || patron.test(v), mensaje)
const texto = z.string().trim().max(100, 'Máximo 100 caracteres.')
/** Rango obligatorio (el servidor responde 400 RANGO_REQUERIDO si falta) y filtros acotados. */
export const esquemaFiltros = z.object({
  desde: z.string().min(1, 'Indica la fecha de inicio.'),
  hasta: z.string().min(1, 'Indica la fecha de fin.'),
  usuario: opcional(/^[1-9]\d{0,9}$/, 'El usuario es un número interno.'),
  agencia: opcional(/^\d{3}$/, 'La agencia tiene 3 dígitos.'),
  modulo: texto,
  codigoEvento: texto,
  resultado: z.enum(['', 'Exitoso', 'Fallido']),
  tipoObjetivo: opcional(/^[A-Za-z0-9_.]{1,100}$/, 'Usa el nombre técnico, p. ej. Clientes.Cliente.'),
  idObjetivo: texto,
  origen: texto,
  canal: texto,
  correlacion: z.string().trim().max(64, 'Máximo 64 caracteres.'),
  idSolicitud: opcional(/^[1-9]\d{0,17}$/, 'La solicitud es un número.'),
}).refine((d) => !d.desde || !d.hasta || d.hasta >= d.desde, { message: 'La fecha de fin no puede ser anterior a la de inicio.', path: ['hasta'] })
export type FormularioFiltros = z.infer<typeof esquemaFiltros>
export type Filtros = Omit<FiltrosBusqueda, 'page' | 'pageSize'>

/** Solo viajan los filtros con valor, siempre en el cuerpo (ASVS 14.2.1). */
export function aFiltros(form: FormularioFiltros): Filtros {
  const filtros: Filtros = { desde: form.desde, hasta: form.hasta }
  for (const clave of ['agencia', 'modulo', 'codigoEvento', 'tipoObjetivo', 'idObjetivo', 'origen', 'canal', 'correlacion'] as const) {
    if (form[clave]) filtros[clave] = form[clave]
  }
  if (form.resultado) filtros.resultado = form.resultado
  if (form.usuario) filtros.usuario = Number(form.usuario)
  if (form.idSolicitud) filtros.idSolicitud = Number(form.idSolicitud)
  return filtros
}
