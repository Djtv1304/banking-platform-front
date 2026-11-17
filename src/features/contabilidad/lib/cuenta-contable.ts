import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'

/* Cómo se muestra una cuenta contable y qué se puede hacer con ella (sin UI) */

const SALDO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

/** La cooperativa opera solo en USD: «$1.234,50» */
export const formatearSaldo = (valor: number) => SALDO.format(valor)

export const estaActiva = (cuenta: Pick<CuentaContable, 'estado'>) => cuenta.estado.trim().toLowerCase() === 'activo'

/** «DEUDORA» → «Deudora»; un valor desconocido se muestra tal cual */
export function etiquetaNaturaleza(naturaleza: string) {
  const texto = naturaleza.trim().toLowerCase()
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '—'
}

/** «ACTIVO» → «Activo»; sin tipo, «—» */
export const etiquetaTipo = (tipo: string | null | undefined) => (tipo ? etiquetaNaturaleza(tipo) : '—')

/**
 * Niveles que fija el catálogo del regulador: elemento (1 dígito), grupo (2), cuenta (4) y
 * subcuenta (6). La cooperativa no los renombra, desactiva ni elimina; sí les cuelga subcuentas.
 */
const LARGOS_REGULADOR = [1, 2, 4, 6]

export const esNivelRegulador = (codigoCuenta: string) => LARGOS_REGULADOR.includes(codigoCuenta.length)

export const LARGO_MAXIMO_CODIGO = 30

/** Las subcuentas propias cuelgan de una cuenta de 6 dígitos o más, para no ocupar códigos del regulador */
const LARGO_MINIMO_PADRE = 6

const MOTIVO_REGULADOR = 'Es un nivel del catálogo del regulador (códigos de 1, 2, 4 y 6 dígitos): no se modifica.'

/** Motivo por el que una acción no está disponible; null = disponible */
export interface BloqueosCuenta {
  nuevaSubcuenta: string | null
  renombrar: string | null
  cambiarEstado: string | null
  eliminar: string | null
}

/**
 * Lo que la SPA ya sabe con los datos del plan. Lo que solo sabe el backend (p. ej. que la cuenta
 * tiene movimientos) se explica en el diálogo y llega como error si ocurre.
 */
export function bloqueosCuenta(cuenta: CuentaContable, tieneSubcuentas: boolean): BloqueosCuenta {
  const activa = estaActiva(cuenta)
  const regulador = esNivelRegulador(cuenta.codigoCuenta)
  const conSaldo = cuenta.saldo !== 0

  const nuevaSubcuenta = !activa
    ? 'La cuenta está inactiva: actívala para crearle subcuentas.'
    : cuenta.codigoCuenta.length < LARGO_MINIMO_PADRE
      ? 'Debajo de este nivel solo van cuentas del catálogo del regulador: crea la subcuenta bajo una cuenta de 6 dígitos.'
      : cuenta.codigoCuenta.length >= LARGO_MAXIMO_CODIGO
      ? `El código ya tiene ${LARGO_MAXIMO_CODIGO} dígitos, el máximo.`
      : cuenta.esImputable && conSaldo
        ? 'Recibe movimientos y tiene saldo: una cuenta con saldo no se divide en subcuentas.'
        : null

  const cambiarEstado = regulador
    ? MOTIVO_REGULADOR
    : activa && conSaldo
      ? 'Tiene saldo distinto de cero: no se puede desactivar hasta que quede en cero.'
      : null

  const eliminar = regulador
    ? MOTIVO_REGULADOR
    : tieneSubcuentas
      ? 'Tiene subcuentas: elimínalas o muévelas primero.'
      : conSaldo
        ? 'Tiene saldo distinto de cero: no se puede eliminar.'
        : null

  return { nuevaSubcuenta, renombrar: regulador ? MOTIVO_REGULADOR : null, cambiarEstado, eliminar }
}
