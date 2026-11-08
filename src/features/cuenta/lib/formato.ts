import type { Agencia } from '@/features/catalogos'
import { ESTADOS_CUENTA, type EstadoCuenta } from '@/features/cuenta/api/cuentas.contract'

/* Cómo se muestran los datos de una cuenta (sin UI, para poder probarlo aparte) */

const MONTO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

const FECHA_CONSULTA = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'medium' })

/** La cooperativa opera solo en USD: «$1.234,50» */
export const formatearMonto = (valor: number) => MONTO.format(valor)

/** Fecha ISO (UTC) en la hora local del navegador; `null` si no es una fecha válida */
export function formatearFechaConsulta(iso: string) {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? null : FECHA_CONSULTA.format(fecha)
}

const ETIQUETAS_ESTADO: Record<EstadoCuenta, string> = {
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
  BLOQUEADA: 'Bloqueada',
  CERRADA: 'Cerrada',
}

export const etiquetaEstado = (estado: EstadoCuenta) => ETIQUETAS_ESTADO[estado]

export const OPCIONES_ESTADO = ESTADOS_CUENTA.map((estado) => ({ value: estado, label: etiquetaEstado(estado) }))

/**
 * «001 · MATRIZ»: el `idAgencia` de 3 caracteres (lo que filtra CTA-02 y trae cada cuenta) y el
 * nombre del catálogo. Hoy CAT-06 usa el código de la agencia como nombre.
 */
export const etiquetaAgencia = ({ idAgencia, nombre }: Pick<Agencia, 'idAgencia' | 'nombre'>) =>
  nombre && nombre !== idAgencia ? `${idAgencia} · ${nombre}` : idAgencia
