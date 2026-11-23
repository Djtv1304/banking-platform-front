import { z } from 'zod'

/*
 * Contrato del plan de cuentas (E2-02) en camelCase.
 *
 * CON-03 (GET) ya existe en el backend: devuelve el plan entero como lista plana, ordenado y sin
 * paginar; la jerarquía viene en `idCuentaSuperior` y el árbol lo arma la SPA.
 * El alta, el cambio de nombre, el cambio de estado y la baja todavía NO existen: se construyen
 * contra el contrato propuesto al backend. Mientras no estén, el servidor responde 404/405/501 y
 * la SPA lo muestra como «todavía no disponible».
 */

const BASE = '/api/v1/contabilidad/cuentas-contables'

export const CONTABILIDAD_ENDPOINTS = {
  cuentas: BASE,
  cuenta: (id: number) => `${BASE}/${id}`,
  estado: (id: number) => `${BASE}/${id}/estado`,
} as const

/** `x-roles` de CON-03; mantener el plan depende del permiso contabilidad:editar */
export const CONTABILIDAD_ROLES = {
  consultar: ['CONTADOR', 'AUDITOR', 'ADMIN'],
} as const

/**
 * Una cuenta del plan (Contabilidad.CuentasContables). `saldo` es Money: llega como número.
 * `tipoCuenta` lo calcula la BD por el primer dígito del código (ACTIVO, PASIVO…) y puede faltar.
 */
export const cuentaContableSchema = z.object({
  idCuentaContable: z.number(),
  codigoCuenta: z.string(),
  nombreCuenta: z.string(),
  /** «DEUDORA» o «ACREEDORA»; se acepta cualquier texto para no rechazar todo el plan */
  naturaleza: z.string(),
  tipoCuenta: z.string().nullish(),
  /** null en las cuentas de primer nivel */
  idCuentaSuperior: z.number().nullable(),
  esImputable: z.boolean(),
  /**
   * E4-04 · propuesto: la cuenta sólo admite asientos automáticos (p. ej. trg_MovimientosContables_SoloAutomatica).
   * El backend todavía no lo envía; si falta, el front no la descarta y el servidor responde 422 CUENTA_SOLO_AUTOMATICA.
   */
  soloAutomatica: z.boolean().optional(),
  saldo: z.number(),
  /** «Activo» o «Inactivo» */
  estado: z.string(),
})

export type CuentaContable = z.infer<typeof cuentaContableSchema>

/** POST propuesto · la naturaleza la hereda del padre en el backend */
export interface CuentaContableCreate {
  codigoCuenta: string
  nombreCuenta: string
  idCuentaSuperior: number
  esImputable: boolean
}

export type EstadoCuentaContable = 'Activo' | 'Inactivo'

/** 202 = la operación quedó pendiente de aprobación (no se aplicó todavía) */
export interface ResultadoMantenimiento {
  pendiente: boolean
}
