import {
  Ban,
  CircleCheck,
  CirclePause,
  Lock,
  LockOpen,
  PauseCircle,
  PiggyBank,
  Target,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import type { AccionCuenta, Cuenta, EstadoCuenta, TipoCuenta } from '@/features/cuenta/api/cuenta.contract'

/*
 * Reglas de la historia A-03. El backend es quien decide; aquí solo se usan para mostrar
 * las acciones posibles y explicar sus consecuencias antes de confirmar.
 */

export const TIPOS_CUENTA: Record<TipoCuenta, string> = {
  AHORROS: 'Cuenta de ahorros',
  CORRIENTE: 'Cuenta corriente',
  AHORRO_PROGRAMADO: 'Ahorro programado',
}

/** Mismo ícono y color por tipo que las tarjetas de cuentas del Home del cliente */
export const ESTILOS_TIPO_CUENTA: Record<TipoCuenta, { Icon: LucideIcon; className: string; corto: string }> = {
  AHORROS: { Icon: PiggyBank, className: 'bg-brand-amber text-brand-ink', corto: 'Ahorro' },
  CORRIENTE: { Icon: Wallet, className: 'bg-brand-navy-deep text-white', corto: 'Corriente' },
  AHORRO_PROGRAMADO: { Icon: Target, className: 'bg-brand-sky text-brand-ink', corto: 'Ahorro programado' },
}

/** El estado nunca se comunica solo con color: siempre lleva ícono y texto */
export const ESTADOS_CUENTA: Record<EstadoCuenta, { label: string; Icon: LucideIcon; className: string }> = {
  ACTIVA: { label: 'Activa', Icon: CircleCheck, className: 'bg-info/25 text-foreground' },
  BLOQUEADA: { label: 'Bloqueada', Icon: Lock, className: 'bg-destructive/15 text-destructive' },
  INACTIVA: { label: 'Inactiva', Icon: CirclePause, className: 'bg-primary/15 text-link' },
  CERRADA: { label: 'Cerrada', Icon: XCircle, className: 'bg-muted text-muted-foreground' },
}

interface AccionConfig {
  label: string
  Icon: LucideIcon
  /** Estados desde los que se puede ejecutar */
  desde: readonly EstadoCuenta[]
  destino: EstadoCuenta
  titulo: string
  consecuencias: string
  confirmar: string
  /** Bloquear y cerrar se muestran como acciones de riesgo */
  critica: boolean
  // TODO(API): confirmar los códigos de motivo con el backend (o si vendrán de un catálogo)
  motivos: readonly { value: string; label: string }[]
}

export const ACCIONES_CUENTA: Record<AccionCuenta, AccionConfig> = {
  BLOQUEAR: {
    label: 'Bloquear',
    Icon: Ban,
    desde: ['ACTIVA', 'INACTIVA'],
    destino: 'BLOQUEADA',
    titulo: '¿Bloquear esta cuenta?',
    consecuencias:
      'Se rechazarán de inmediato todos los débitos, retiros, transferencias y pagos con tarjeta. Los créditos y depósitos se seguirán recibiendo.',
    confirmar: 'Bloquear cuenta',
    critica: true,
    motivos: [
      { value: 'SOLICITUD_CLIENTE', label: 'Solicitud del cliente' },
      { value: 'SOSPECHA_FRAUDE', label: 'Sospecha de fraude' },
      { value: 'PERDIDA_ROBO', label: 'Pérdida o robo de tarjeta' },
      { value: 'ORDEN_JUDICIAL', label: 'Orden judicial o de autoridad' },
    ],
  },
  INACTIVAR: {
    label: 'Inactivar',
    Icon: PauseCircle,
    desde: ['ACTIVA'],
    destino: 'INACTIVA',
    titulo: '¿Inactivar esta cuenta?',
    consecuencias:
      'La cuenta dejará de operar por canales digitales y en ventanilla hasta que se reactive. El saldo se conserva.',
    confirmar: 'Inactivar cuenta',
    critica: false,
    motivos: [
      { value: 'SOLICITUD_CLIENTE', label: 'Solicitud del cliente' },
      { value: 'SIN_MOVIMIENTOS', label: 'Falta de movimientos' },
      { value: 'DATOS_DESACTUALIZADOS', label: 'Actualización de datos pendiente' },
    ],
  },
  REACTIVAR: {
    label: 'Reactivar',
    Icon: LockOpen,
    desde: ['BLOQUEADA', 'INACTIVA'],
    destino: 'ACTIVA',
    titulo: '¿Reactivar esta cuenta?',
    consecuencias:
      'La cuenta volverá a operar con normalidad en todos los canales. Verifica que la causa del bloqueo o inactivación ya no exista.',
    confirmar: 'Reactivar cuenta',
    critica: false,
    motivos: [
      { value: 'SOLICITUD_CLIENTE', label: 'Solicitud del cliente' },
      { value: 'RIESGO_DESCARTADO', label: 'Riesgo descartado tras la revisión' },
      { value: 'DATOS_ACTUALIZADOS', label: 'Datos actualizados' },
    ],
  },
  CERRAR: {
    label: 'Cerrar',
    Icon: XCircle,
    desde: ['ACTIVA', 'BLOQUEADA', 'INACTIVA'],
    destino: 'CERRADA',
    titulo: '¿Cerrar esta cuenta?',
    consecuencias:
      'El cierre es definitivo: la cuenta no podrá reactivarse y se cancelarán sus tarjetas y débitos automáticos asociados.',
    confirmar: 'Cerrar cuenta',
    critica: true,
    motivos: [
      { value: 'SOLICITUD_CLIENTE', label: 'Solicitud del cliente' },
      { value: 'RIESGO', label: 'Decisión de la cooperativa por riesgo' },
      { value: 'FALLECIMIENTO', label: 'Fallecimiento del titular' },
    ],
  },
}

export const accionesDisponibles = (estado: EstadoCuenta) =>
  (Object.keys(ACCIONES_CUENTA) as AccionCuenta[]).filter((accion) => ACCIONES_CUENTA[accion].desde.includes(estado))

/** Solo se puede cerrar una cuenta sin saldo */
export const puedeCerrarse = (cuenta: Cuenta) => cuenta.saldoDisponible === 0

export const enmascararCuenta = (numero: string) => `•••• ${numero.slice(-4)}`

export const formatearMonto = (valor: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valor)

export const formatearFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    // Una fecha sin hora (YYYY-MM-DD) se interpreta como local para no correrse un día
    new Date(iso.length === 10 ? `${iso}T00:00:00` : iso),
  )
