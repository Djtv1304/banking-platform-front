import { etiquetaContable } from '@/features/contabilidad/lib/etiquetas'
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import type { AsignacionCuenta, ClaseCuenta } from '@/features/contabilidad/api/cuentas-producto.contract'
import { estaActiva } from '@/features/contabilidad/lib/cuenta-contable'

/* E3-05 · Etiquetas, pestañas y cuentas candidatas (sin UI, para probarlo aparte) */

const TIPOS: Record<string, string> = {
  CUENTA_AHORRO: 'Cuenta de ahorro',
  CUENTA_CORRIENTE: 'Cuenta corriente',
  CERTIFICADO_APORTACION: 'Certificados de aportación',
  CREDITO: 'Crédito',
  TARJETA: 'Tarjetas',
}
const CREDITOS: Record<string, string> = { CONSUMO: 'Crédito de consumo', MICRO: 'Microcrédito' }
const SITUACIONES: Record<string, string> = { POR_VENCER: 'por vencer', NO_DEVENGA: 'que no devenga intereses', VENCIDA: 'vencida' }
const CONDICIONES: Record<string, string> = { ORIGINAL: '', REFINANCIADA: 'refinanciada', REESTRUCTURADA: 'reestructurada' }

export interface Pestana {
  clave: string
  etiqueta: string
  idTipoProducto: number
  idTipoCredito: number | null
}

/** Una pestaña por tipo de producto; el crédito, una por tipo de crédito (el CUC los separa) */
export function pestanas(clases: readonly ClaseCuenta[]): Pestana[] {
  const vistas = new Map<string, Pestana>()
  for (const k of clases) {
    const clave = `${k.idTipoProducto}-${k.idTipoCredito ?? ''}`
    if (vistas.has(clave)) continue
    vistas.set(clave, {
      clave,
      etiqueta: k.codigoTipoCredito ? (CREDITOS[k.codigoTipoCredito] ?? etiquetaContable(k.codigoTipoCredito)) : (TIPOS[k.codigoTipoProducto] ?? etiquetaContable(k.codigoTipoProducto)),
      idTipoProducto: k.idTipoProducto,
      idTipoCredito: k.idTipoCredito,
    })
  }
  return [...vistas.values()]
}

/** «Cartera refinanciada vencida · De 31 a 90 días» */
export function descripcionClase(k: ClaseCuenta) {
  const partes = [etiquetaContable(k.codigoRol, k.nombreRol)]
  const condicion = k.condicion ? CONDICIONES[k.condicion] : ''
  if (condicion) partes.push(condicion)
  if (k.situacion) partes.push(SITUACIONES[k.situacion] ?? etiquetaContable(k.situacion).toLowerCase())
  const texto = partes.join(' ')
  return k.tramo !== null && k.nombreCuentaBase ? `${texto} · ${k.nombreCuentaBase}` : texto
}

/** Grupo visual de la fila: la cartera se agrupa por condición y situación */
export function grupoClase(k: ClaseCuenta) {
  if (k.codigoRol === 'CARTERA') return descripcionClase({ ...k, tramo: null })
  if (k.codigoRol.startsWith('CONTRA_') || ['CASTIGO', 'INTERES_SUSPENSO', 'DEPOSITO_NO_CUBIERTO'].includes(k.codigoRol)) {
    return 'Cuentas de orden y contingentes'
  }
  if (['APROBADO_NO_DESEMBOLSADO', 'CUPO_NO_UTILIZADO'].includes(k.codigoRol)) return 'Cuentas de orden y contingentes'
  return 'Cuentas principales'
}

export type Alcance = { nivel: 'TIPO' } | { nivel: 'PRODUCTO'; id: number } | { nivel: 'SUBPRODUCTO'; id: number }

/** La asignación vigente de una clase en un alcance (las programadas se muestran aparte) */
export function asignacionVigente(asignaciones: readonly AsignacionCuenta[], idClase: number, alcance: Alcance, hoy: string) {
  return asignaciones.find(
    (a) =>
      a.idClase === idClase &&
      a.vigenciaDesde <= hoy &&
      (alcance.nivel === 'TIPO'
        ? a.idProducto === null && a.idSubProducto === null
        : alcance.nivel === 'PRODUCTO'
          ? a.idProducto === alcance.id
          : a.idSubProducto === alcance.id),
  )
}

/** Excepciones: asignaciones de un producto o subproducto sobre un rol que se asigna por tipo */
export const excepciones = (asignaciones: readonly AsignacionCuenta[], clases: readonly ClaseCuenta[]) =>
  asignaciones.filter((a) => {
    const k = clases.find((c) => c.idClase === a.idClase)
    return k && (k.nivel === 'TIPO' ? a.idProducto !== null || a.idSubProducto !== null : a.idSubProducto !== null)
  })

/** Cuentas que el backend acepta para el rol: activas, imputables, sin hijas y bajo su cuenta base */
export function cuentasCandidatas(plan: readonly CuentaContable[], cuentaBase: string) {
  const conHijas = new Set(plan.map((c) => c.idCuentaSuperior).filter((id): id is number => id !== null))
  return plan
    .filter((c) => c.codigoCuenta.startsWith(cuentaBase) && c.esImputable && estaActiva(c) && !conHijas.has(c.idCuentaContable))
    .sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta))
}

/** Mañana (Ecuador, UTC−5): la vigencia mínima sugerida de una asignación nueva */
export function manana(ahora = new Date()) {
  const ecuador = new Date(ahora.getTime() - 5 * 3600_000)
  ecuador.setUTCDate(ecuador.getUTCDate() + 1)
  return ecuador.toISOString().slice(0, 10)
}

export const hoyEcuador = (ahora = new Date()) => new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10)

const MENSAJES: Record<string, string> = {
  CUENTA_NO_CORRESPONDE: 'La cuenta debe ser activa, imputable, del último nivel y estar bajo la cuenta base del rol.',
  CUENTA_YA_ASIGNADA: 'Esa cuenta ya es el capital de otro producto: cada producto lleva su propia cuenta de capital.',
  ROL_NO_APLICA: 'El rol no corresponde a ese producto.',
  ROL_POR_PRODUCTO: 'Este rol se asigna a cada producto.',
  VIGENCIA_PASADA: 'La asignación no puede iniciar en el pasado.',
  VIGENCIA_SOLAPADA: 'Ya hay una asignación que inicia en esa fecha o después.',
  SOLICITUD_YA_PENDIENTE: 'Ya hay una solicitud en curso para este tipo de producto: espera a que la aprueben o la rechacen.',
  CAMBIO_REPETIDO: 'Cada rol y alcance va una sola vez en la solicitud.',
  CUENTA_OBLIGATORIA: 'El rol del tipo necesita una cuenta; solo una excepción se puede quitar.',
}

export const mensajeCuentasProducto = (code: string, porDefecto: string) => MENSAJES[code] ?? porDefecto
